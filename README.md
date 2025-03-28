# Bug Reporting System

## Overview

A reporting system for people that can't join our discord, this allows them to report bugs to us with out needing to join our discord

## Features

- **Intuitive Reporting Interface**: Minimalist, dark-themed submission form
- **Flexible Attachment Support**: Optional image uploads
- **Abuse Prevention**: IP-based rate limiting
- **Real-time Notifications**: Direct Discord webhook integration
- **Comprehensive Error Handling**: Detailed user feedback and logging

## Technology Stack

- Next.js 13
- TypeScript
- Tailwind CSS
- Discord Webhooks

## Prerequisites

- Node.js 16+
- npm or Yarn
- Discord Webhook URL

### Submission Limits

- Rate limited to one submission per IP address per 10 minutes
- Supports image uploads (PNG, JPEG, GIF)
- Maximum file size determined by server configuration

## Security Considerations

- IP-based submission throttling
- Strict file type validation
- Secure webhook transmission
- Comprehensive error logging

## License

Distributed under the MIT License.

## Contact

For support or inquiries, please email contact@deadstudios.xyz
