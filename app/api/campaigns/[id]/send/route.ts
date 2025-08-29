// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus } from '@/lib/cosmic'
import { resend } from '@/lib/resend'

// Helper function to generate unsubscribe token
function generateUnsubscribeToken(email: string): string {
  return Buffer.from(email + process.env.COSMIC_BUCKET_SLUG).toString('base64')
}

// Helper function to add unsubscribe link to email content
function addUnsubscribeLink(content: string, email: string): string {
  const token = generateUnsubscribeToken(email)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
  
  // Create unsubscribe footer
  const unsubscribeFooter = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>
        You received this email because you subscribed to our mailing list.
        <br>
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
        from future emails.
      </p>
    </div>
  `

  // If content already contains closing body tag, insert before it
  if (content.includes('</body>')) {
    return content.replace('</body>', `${unsubscribeFooter}</body>`)
  } else {
    // Otherwise, append at the end
    return content + unsubscribeFooter
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get campaign data
    const campaign = await getMarketingCampaign(id)
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.metadata.status.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Campaign has already been sent or is not in draft status' },
        { status: 400 }
      )
    }

    const template = campaign.metadata.template
    const targetContacts = campaign.metadata.target_contacts || []

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No target contacts specified for this campaign' },
        { status: 400 }
      )
    }

    if (!template || !template.metadata) {
      return NextResponse.json(
        { error: 'Campaign template not found or invalid' },
        { status: 400 }
      )
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Send emails to each contact
    for (const contact of targetContacts) {
      if (!contact.metadata?.email) {
        failed++
        errors.push(`Contact ${contact.title} has no email address`)
        continue
      }

      // Skip unsubscribed contacts
      if (contact.metadata.status?.value === 'Unsubscribed') {
        continue
      }

      try {
        // Replace template variables in content
        let emailContent = template.metadata.content || ''
        let emailSubject = template.metadata.subject || ''

        if (contact.metadata.first_name) {
          emailContent = emailContent.replace(/\{\{first_name\}\}/g, contact.metadata.first_name)
          emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, contact.metadata.first_name)
        }

        if (contact.metadata.last_name) {
          emailContent = emailContent.replace(/\{\{last_name\}\}/g, contact.metadata.last_name)
          emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, contact.metadata.last_name)
        }

        // Add unsubscribe link to email content
        emailContent = addUnsubscribeLink(emailContent, contact.metadata.email)

        // Send email with proper error handling for Resend API
        const result = await resend.emails.send({
          from: 'noreply@cosmicjs.com',
          to: contact.metadata.email,
          subject: emailSubject,
          html: emailContent,
        })

        // If we get here, the email was sent successfully
        if (result && typeof result === 'object' && 'id' in result) {
          sent++
        } else {
          failed++
          errors.push(`Failed to send to ${contact.metadata.email}: Unexpected response format`)
        }

      } catch (error) {
        failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to send to ${contact.metadata.email}: ${errorMessage}`)
        console.error(`Email send error for ${contact.metadata.email}:`, error)
      }
    }

    // Update campaign status and stats
    const stats = {
      sent,
      delivered: sent, // Assume all sent emails are delivered for now
      opened: 0,
      clicked: 0,
      bounced: failed,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    await updateCampaignStatus(id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully. ${sent} emails sent, ${failed} failed.`,
      stats: {
        sent,
        failed,
        errors: errors.slice(0, 10) // Limit error messages to first 10
      }
    })

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}