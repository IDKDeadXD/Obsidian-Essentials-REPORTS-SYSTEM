import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordWebhook } from '@/lib/discord';

// Declare global types to avoid TypeScript errors
declare global {
  var submissionTimes: Record<string, number>;
  var lastSubmittedReport: {
    title: string;
    description: string;
  } | null;
}

// Initialize global variables if not already set
globalThis.submissionTimes = globalThis.submissionTimes || {};
globalThis.lastSubmittedReport = globalThis.lastSubmittedReport || null;

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    const clientIp = req.ip || 'unknown';

    console.log('Received text report:', { title, description });

    // Check rate limit (10 minutes = 600000 ms)
    const currentTime = Date.now();
    if (globalThis.submissionTimes[clientIp] && 
        currentTime - globalThis.submissionTimes[clientIp] < 600000) {
      return NextResponse.json(
        { message: 'Please wait 10 minutes between submissions' }, 
        { status: 429 }
      );
    }

    if (!title || !description) {
      return NextResponse.json(
        { message: 'Title and description are required' }, 
        { status: 400 }
      );
    }

    // Store the report details and submission time
    globalThis.lastSubmittedReport = { title, description };
    globalThis.submissionTimes[clientIp] = currentTime;

    return NextResponse.json({ 
      message: 'Report text submitted successfully'
    });
  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json(
      { message: 'Failed to submit report' }, 
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    console.log('Received file upload:', {
      fileName: file instanceof File ? file.name : 'Not a File',
      fileType: file instanceof File ? file.type : 'Unknown',
      fileSize: file instanceof File ? file.size : 'Unknown'
    });

    if (!file || !(file instanceof File)) {
      // If no file, send the previous report details to Discord
      if (globalThis.lastSubmittedReport) {
        await sendDiscordWebhook(
          globalThis.lastSubmittedReport.title, 
          globalThis.lastSubmittedReport.description
        );
        
        globalThis.lastSubmittedReport = null;
        
        return NextResponse.json({ 
          message: 'Text-only report sent successfully' 
        });
      }

      return NextResponse.json(
        { message: 'No valid file uploaded and no previous report found' }, 
        { status: 400 }
      );
    }

    // Convert File to Buffer for Discord upload
    const buffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(buffer);

    // Safely access lastSubmittedReport
    const reportTitle = globalThis.lastSubmittedReport?.title || 'Uploaded Image';
    const reportDescription = globalThis.lastSubmittedReport?.description || 'Image attached';

    // Send webhook with both text and image
    await sendDiscordWebhook(
      reportTitle, 
      reportDescription, 
      fileBuffer,
      file.name
    );

    globalThis.lastSubmittedReport = null;

    return NextResponse.json({ 
      message: 'Report with file submitted successfully' 
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { message: 'Failed to upload file' }, 
      { status: 500 }
    );
  }
}