import axios from 'axios';
import FormData from 'form-data';

export async function sendDiscordWebhook(
  title: string, 
  description: string, 
  imageBuffer?: Buffer | null,
  filename?: string
) {
  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  
  console.log('Webhook called with:', { title, description, hasImage: !!imageBuffer });

  if (!webhookUrl) {
    console.error('Discord webhook URL is missing');
    throw new Error('Discord webhook not configured');
  }

  try {
    // If no image, send simple text embed
    if (!imageBuffer) {
      await axios.post(webhookUrl, {
        embeds: [{
          title: title ? `Bug Report: ${title}` : 'Bug Report',
          description: description || 'No description provided',
          color: 0xFFFFFF,
          footer: {
            text: `Submitted at ${new Date().toLocaleString()}`
          }
        }]
      });
      
      console.log('Text-only webhook message sent successfully');
      return;
    }

    // If image exists, use FormData to send embed with image
    const formData = new FormData();
    
    const payload = {
      embeds: [{
        title: title ? `Bug Report: ${title}` : 'Bug Report',
        description: description || 'No description provided',
        color: 0xFFFFFF,
        image: {
          url: `attachment://${filename || 'image.png'}`
        },
        footer: {
          text: `Submitted at ${new Date().toLocaleString()}`
        }
      }]
    };

    formData.append('payload_json', JSON.stringify(payload));
    formData.append('files[0]', imageBuffer, {
      filename: filename || 'image.png',
      contentType: 'image/png'
    });

    await axios.post(webhookUrl, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    console.log('Webhook message with image sent successfully');
  } catch (error) {
    console.error('Discord webhook error:', error);
    throw new Error('Failed to send report to Discord');
  }
}