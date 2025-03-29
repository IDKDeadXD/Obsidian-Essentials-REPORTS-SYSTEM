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
    blacklistedIPs: Set<string>; // Add blacklist storage
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
setGlobalProperty('blacklistedIPs', getGlobalProperty('blacklistedIPs') || new Set());

// Function to check if an IP is blacklisted
const isIpBlacklisted = (ip: string): boolean => {
  const blacklistedIPs = getGlobalProperty('blacklistedIPs');
  return blacklistedIPs.has(ip);
};

// Function to blacklist an IP
const blacklistIp = (ip: string): void => {
  const blacklistedIPs = getGlobalProperty('blacklistedIPs');
  blacklistedIPs.add(ip);
  setGlobalProperty('blacklistedIPs', blacklistedIPs);
  console.log(`IP ${ip} has been blacklisted`);
};

// Verify admin credentials from environment variables
const verifyAdminCredentials = (username: string, password: string): boolean => {
  const validUsername = process.env.ADMIN_USER;
  const validPassword = process.env.ADMIN_PASS;
  
  return username === validUsername && password === validPassword;
};

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    
    // Check if the IP is blacklisted
    if (isIpBlacklisted(clientIp)) {
      return NextResponse.json(
        { message: 'Access denied. Your IP has been blacklisted.' }, 
        { status: 403 }
      );
    }

    const { title, description } = await req.json();

    console.log('Received text report:', { title, description, clientIp });

    // Check rate limit (10 minutes = 600000 ms)
    const currentTime = Date.now();
    const submissionTimes = getGlobalProperty('submissionTimes');
    if (submissionTimes[clientIp] && 
        currentTime - submissionTimes[clientIp] < 600000) {
      // Optionally, track rate limit violations and blacklist after multiple violations
      // For example:
      // if (rateViolationCount[clientIp] > 3) blacklistIp(clientIp);
      
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

// Add IP information to the Discord webhook
export async function PUT(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    
    // Check if the IP is blacklisted
    if (isIpBlacklisted(clientIp)) {
      return NextResponse.json(
        { message: 'Access denied. Your IP has been blacklisted.' }, 
        { status: 403 }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get('file');

    console.log('Received file upload:', {
      fileName: file instanceof File ? file.name : 'Not a File',
      fileType: file instanceof File ? file.type : 'Unknown',
      fileSize: file instanceof File ? file.size : 'Unknown',
      clientIp
    });

    const lastSubmittedReport = getGlobalProperty('lastSubmittedReport');

    if (!file || !(file instanceof File)) {
      // If no file, send the previous report details to Discord
      if (lastSubmittedReport) {
        // Attach IP information to the description
        const reportWithIp = `${lastSubmittedReport.description}\n\n*Submitted from IP: ${clientIp}*`;
        
        await sendDiscordWebhook(
          lastSubmittedReport.title, 
          reportWithIp
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
    // Attach IP information to the description
    const reportDescription = `${lastSubmittedReport?.description || 'Image attached'}\n\n*Submitted from IP: ${clientIp}*`;

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

// Add a new endpoint for admin functions (blacklisting IPs)
export async function PATCH(req: NextRequest) {
  try {
    // Authenticate with username and password from headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return NextResponse.json(
        { message: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Decode the base64 credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    // Verify credentials
    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { message: 'Invalid credentials' }, 
        { status: 401 }
      );
    }

    const { action, ip } = await req.json();

    if (action === 'blacklist' && ip) {
      blacklistIp(ip);
      return NextResponse.json({ 
        message: `IP ${ip} has been blacklisted`
      });
    } else if (action === 'unblacklist' && ip) {
      const blacklistedIPs = getGlobalProperty('blacklistedIPs');
      blacklistedIPs.delete(ip);
      setGlobalProperty('blacklistedIPs', blacklistedIPs);
      return NextResponse.json({ 
        message: `IP ${ip} has been removed from blacklist`
      });
    } else if (action === 'list') {
      const blacklistedIPs = Array.from(getGlobalProperty('blacklistedIPs'));
      return NextResponse.json({ 
        blacklistedIPs
      });
    }

    return NextResponse.json(
      { message: 'Invalid action' }, 
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin operation error:', error);
    return NextResponse.json(
      { message: 'Failed to perform admin operation' }, 
      { status: 500 }
    );
  }
}