import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(data: EmailData): Promise<SendEmailResponse> {
  try {
    const result = await resend.emails.send({
      from: data.from,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email'
      };
    }

    return {
      success: true,
      messageId: result.data?.id
    };
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Proper error handling for unknown error type
    let errorMessage = 'Failed to send email';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function sendBulkEmail(
  contacts: Array<{ email: string; firstName?: string; lastName?: string }>,
  template: { subject: string; content: string },
  from: string = 'noreply@yourdomain.com'
): Promise<{ 
  success: boolean; 
  sent: number; 
  failed: number; 
  errors: Array<{ email: string; error: string }> 
}> {
  let sent = 0;
  let failed = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const contact of contacts) {
    try {
      // Replace template variables
      let personalizedContent = template.content;
      let personalizedSubject = template.subject;
      
      if (contact.firstName) {
        personalizedContent = personalizedContent.replace(/\{\{first_name\}\}/g, contact.firstName);
        personalizedSubject = personalizedSubject.replace(/\{\{first_name\}\}/g, contact.firstName);
      }
      
      if (contact.lastName) {
        personalizedContent = personalizedContent.replace(/\{\{last_name\}\}/g, contact.lastName);
        personalizedSubject = personalizedSubject.replace(/\{\{last_name\}\}/g, contact.lastName);
      }

      const result = await sendEmail({
        to: contact.email,
        from,
        subject: personalizedSubject,
        html: personalizedContent
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push({
          email: contact.email,
          error: result.error || 'Unknown error'
        });
      }
    } catch (error) {
      failed++;
      let errorMessage = 'Failed to send email';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      errors.push({
        email: contact.email,
        error: errorMessage
      });
    }

    // Add small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    success: sent > 0,
    sent,
    failed,
    errors
  };
}