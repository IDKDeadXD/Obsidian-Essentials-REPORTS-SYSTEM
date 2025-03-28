import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordWebhook } from '@/lib/discord';

// Rate limiting map
const requestCounts: Record<string, { count: number; resetTime: number }> = {};

function rateLimiter(ip: string) {
  const now = Date.now();
  const windowMs = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || '60000');
  const maxRequests = parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS || '5');

  // Clean up expired entries
  Object.keys(requestCounts).forEach(key => {
    if (requestCounts[key].resetTime < now) {
      delete requestCounts[key];
    }
  });

  // Initialize or update request count
  if (!requestCounts[ip]) {
    requestCounts[ip] = {
      count: 1,
      resetTime: now + windowMs
    };
  } else {
    requestCounts[ip].count++;
  }

  return requestCounts[ip].count <= maxRequests;
}

export async function POST(req: NextRequest) {
  const ip = req.ip || 'unknown';

  // Rate limiting
  if (!rateLimiter(ip)) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' }, 
      { status: 429 }
    );
  }

  try {
    const { title, description, hasFile } = await req.json();

    // Validate inputs
    if (!title || !description) {
      return NextResponse.json(
        { message: 'Title and description are required' }, 
        { status: 400 }
      );
    }

    // Send to Discord webhook
    await sendDiscordWebhook(title, description);

    return NextResponse.json({ 
      message: 'Report submitted successfully', 
      requiresFileUpload: hasFile 
    });
  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json(
      { message: 'Failed to submit report' }, 
      { status: 500 }
    );
  }
}
