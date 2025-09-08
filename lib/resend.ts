import { Resend } from 'resend'
import { EmailTemplate, Settings, EmailContact, TemplateSnapshot } from '@/types'

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
    // Ensure text field is always a string (required by Resend API)
    const textContent = options.text || (options.html ? options.html.replace(/<[^>]*>/g, '') : options.subject)
    
    const result = await resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: textContent, // Now guaranteed to be a string
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

// Export the sendCampaignEmails function for cron job usage
export async function sendCampaignEmails(
  campaignId: string,
  template: EmailTemplate,
  contacts: EmailContact[],
  settings: Settings,
  templateSnapshot?: TemplateSnapshot
): Promise<{ success: boolean; sent_count: number; error?: string }> {
  try {
    if (!contacts || contacts.length === 0) {
      return { success: false, sent_count: 0, error: 'No contacts to send to' }
    }

    // Use template snapshot if available (for sent campaigns), otherwise use current template
    const emailContent = templateSnapshot?.content || template.metadata.content
    const emailSubject = templateSnapshot?.subject || template.metadata.subject

    if (!emailContent || !emailSubject) {
      return { success: false, sent_count: 0, error: 'Template content or subject is missing' }
    }

    let sentCount = 0
    const fromEmail = `${settings.metadata.from_name} <${settings.metadata.from_email}>`

    // Send emails to each contact
    for (const contact of contacts) {
      try {
        // Skip unsubscribed or bounced contacts
        if (contact.metadata.status?.value !== 'Active') {
          console.log(`Skipping contact ${contact.metadata.email} with status: ${contact.metadata.status?.value}`)
          continue
        }

        // Personalize content
        let personalizedContent = emailContent
        let personalizedSubject = emailSubject

        // Replace template variables
        personalizedContent = personalizedContent.replace(/\{\{first_name\}\}/g, contact.metadata.first_name || 'there')
        personalizedContent = personalizedContent.replace(/\{\{last_name\}\}/g, contact.metadata.last_name || '')
        personalizedSubject = personalizedSubject.replace(/\{\{first_name\}\}/g, contact.metadata.first_name || 'there')
        personalizedSubject = personalizedSubject.replace(/\{\{last_name\}\}/g, contact.metadata.last_name || '')

        // Add unsubscribe link if not already present
        if (!personalizedContent.includes('unsubscribe')) {
          const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(contact.metadata.email)}`
          personalizedContent += `<br><br><small><a href="${unsubscribeUrl}">Unsubscribe</a></small>`
        }

        await sendEmail({
          from: fromEmail,
          to: contact.metadata.email,
          subject: personalizedSubject,
          html: personalizedContent,
          reply_to: settings.metadata.reply_to_email || settings.metadata.from_email,
          headers: {
            'X-Campaign-ID': campaignId,
            'X-Contact-ID': contact.id
          }
        })

        sentCount++
        console.log(`Sent email to ${contact.metadata.email}`)

      } catch (contactError) {
        console.error(`Failed to send email to ${contact.metadata.email}:`, contactError)
        // Continue with other contacts even if one fails
      }
    }

    return {
      success: sentCount > 0,
      sent_count: sentCount,
      error: sentCount === 0 ? 'No emails were sent successfully' : undefined
    }

  } catch (error) {
    console.error('Campaign email sending error:', error)
    return {
      success: false,
      sent_count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}