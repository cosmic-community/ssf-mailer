import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Type definitions for Resend API responses based on actual Resend library types
export interface SendEmailOptions {
  from: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
  reply_to?: string
  headers?: Record<string, string>
}

// The Resend library returns a Promise that resolves to either success data or throws an error
export interface ResendSuccessResponse {
  id: string
}

export interface ResendErrorResponse {
  message: string
  name: string
}

// Export the sendEmail function that wraps the Resend SDK
export async function sendEmail(options: SendEmailOptions): Promise<ResendSuccessResponse> {
  try {
    const result = await resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      reply_to: options.reply_to,
      headers: options.headers
    })

    // The Resend SDK returns { data: { id: string }, error: null } on success
    // or { data: null, error: ErrorObject } on failure
    if (result.error) {
      throw new Error(result.error.message || 'Failed to send email')
    }

    if (!result.data?.id) {
      throw new Error('Invalid response from Resend API')
    }

    return { id: result.data.id }
  } catch (error: any) {
    console.error('Resend API error:', error)
    throw new Error(error.message || 'Failed to send email via Resend')
  }
}