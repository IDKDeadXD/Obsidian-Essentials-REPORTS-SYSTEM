import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordWebhook } from '@/lib/discord';

// Augment the global type to include custom properties
declare global {
  interface GlobalThis {
    submissionTimes: Record<string, number>;
    lastSubmittedReport: {
      title: string;
      description: string;
    } | null;
  }
}

// Create a type-safe way to access global properties
const getGlobalProperty = <K extends keyof GlobalThis>(key: K): GlobalThis[K] => {
  return (globalThis as unknown as GlobalThis)[key];
};

const setGlobalProperty = <K extends keyof GlobalThis>(key: K, value: GlobalThis[K]): void => {
  (globalThis as unknown as GlobalThis)[key] = value;
};

// Function to extract client IP address
const getClientIp = (req: NextRequest): string => {
  // Try different headers used for IP identification
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'fastly-client-ip'
  ];

  for (const header of ipHeaders) {
    const ip = req.headers.get(header);
    if (ip) return ip.split(',')[0].trim();
  }

  return 'unknown';
};

// Initialize global variables if not already set
setGlobalProperty('submissionTimes', getGlobalProperty('submissionTimes') || {});
setGlobalProperty('lastSubmittedReport', getGlobalProperty('lastSubmittedReport') || null);

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    const clientIp = getClientIp(req);

    console.log('Received text report:', { title, description });

    // Check rate limit (10 minutes = 600000 ms)
    const currentTime = Date.now();
    const submissionTimes = getGlobalProperty('submissionTimes');
    if (submissionTimes[clientIp] && 
        currentTime - submissionTimes[clientIp] < 600000) {
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
    setGlobalProperty('lastSubmittedReport', { title, description });
    submissionTimes[clientIp] = currentTime;
    setGlobalProperty('submissionTimes', submissionTimes);

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

    const lastSubmittedReport = getGlobalProperty('lastSubmittedReport');

    if (!file || !(file instanceof File)) {
      // If no file, send the previous report details to Discord
      if (lastSubmittedReport) {
        await sendDiscordWebhook(
          lastSubmittedReport.title, 
          lastSubmittedReport.description
        );
        
        setGlobalProperty('lastSubmittedReport', null);
        
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
    const reportTitle = lastSubmittedReport?.title || 'Uploaded Image';
    const reportDescription = lastSubmittedReport?.description || 'Image attached';

    // Send webhook with both text and image
    await sendDiscordWebhook(
      reportTitle, 
      reportDescription, 
      fileBuffer,
      file.name
    );

    setGlobalProperty('lastSubmittedReport', null);

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