import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from: string
  text?: string
}

export async function sendEmail({ to, subject, html, from, text }: SendEmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      text: text || undefined,
    })

    if (error) {
      throw new Error(`Resend API error: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Email sending failed:', error)
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function sendBulkEmail(emails: SendEmailOptions[]) {
  const results = []
  
  for (const emailData of emails) {
    try {
      const result = await sendEmail(emailData)
      results.push({ success: true, data: result })
    } catch (error) {
      results.push({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        to: emailData.to 
      })
    }
  }
  
  return results
}