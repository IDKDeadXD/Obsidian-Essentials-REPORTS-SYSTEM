import axios from 'axios';
import FormData from 'form-data';

export async function sendDiscordWebhook(
  title: string, 
  description: string, 
  file?: File
) {
  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    throw new Error('Discord webhook URL is not configured');
  }

  const formData = new FormData();
  
  // Add text payload
  formData.append('payload_json', JSON.stringify({
    embeds: [{
      title: title,
      description: description,
      color: 0x3498db // Blue color
    }]
  }));

  // Add file if exists
  if (file) {
    formData.append('file', file, file.name);
  }

  try {
    const response = await axios.post(webhookUrl, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    return response.data;
  } catch (error) {
    console.error('Discord webhook error:', error);
    throw error;
  }
}
