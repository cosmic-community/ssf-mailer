import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(emailData: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: emailData.from || 'noreply@yourdomain.com',
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

export async function sendBulkEmails(emails: EmailData[]) {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ success: true, data: result });
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

// Template personalization function
export function personalizeTemplate(template: string, contact: any): string {
  let personalizedTemplate = template;
  
  // Replace common merge tags
  personalizedTemplate = personalizedTemplate.replace(/\{\{first_name\}\}/g, contact.first_name || 'there');
  personalizedTemplate = personalizedTemplate.replace(/\{\{last_name\}\}/g, contact.last_name || '');
  personalizedTemplate = personalizedTemplate.replace(/\{\{email\}\}/g, contact.email || '');
  
  // Add more personalizations as needed
  const currentDate = new Date();
  personalizedTemplate = personalizedTemplate.replace(/\{\{month\}\}/g, currentDate.toLocaleDateString('en-US', { month: 'long' }));
  personalizedTemplate = personalizedTemplate.replace(/\{\{year\}\}/g, currentDate.getFullYear().toString());
  
  return personalizedTemplate;
}