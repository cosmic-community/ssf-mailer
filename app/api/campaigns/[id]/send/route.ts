// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, getEmailContacts, updateCampaignStatus, getSettings } from '@/lib/cosmic'
import { sendEmail } from '@/lib/resend'
import { addTrackingToEmail } from '@/lib/email-tracking'
import { EmailContact, CampaignStats } from '@/types'

interface ResendSuccessResponse {
  id: string;
  [key: string]: any;
}

interface ResendErrorResponse {
  message: string;
  [key: string]: any;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Get campaign details
    const campaign = await getMarketingCampaign(id)
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign is already sent
    if (campaign.metadata?.status?.value === 'Sent') {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 400 }
      )
    }

    // Get email template content
    const template = campaign.metadata?.template
    if (!template || !template.metadata) {
      return NextResponse.json(
        { error: 'Campaign template not found or invalid' },
        { status: 400 }
      )
    }

    // Get target contacts - Fix: Handle contact IDs properly
    const targetContactIds = campaign.metadata?.target_contacts || []
    if (!Array.isArray(targetContactIds) || targetContactIds.length === 0) {
      return NextResponse.json(
        { error: 'No target contacts found for this campaign' },
        { status: 400 }
      )
    }

    // Get all email contacts to match with target IDs
    const allContacts = await getEmailContacts()
    
    // Fix: Filter contacts by IDs and ensure they're active
    const targetContacts: EmailContact[] = allContacts.filter(contact => 
      targetContactIds.includes(contact.id) && 
      contact.metadata?.status?.value === 'Active'
    )

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No active contacts found to send to' },
        { status: 400 }
      )
    }

    // Extract email addresses from contact objects
    const recipientEmails: string[] = targetContacts.map((contact: EmailContact) => contact.metadata.email)

    // Get settings for email configuration
    const settings = await getSettings()
    if (!settings?.metadata) {
      return NextResponse.json(
        { error: 'Email settings not configured' },
        { status: 400 }
      )
    }

    const fromName = settings.metadata.from_name || 'Email Marketing'
    const fromEmail = settings.metadata.from_email
    const replyToEmail = settings.metadata.reply_to_email || fromEmail
    const companyAddress = settings.metadata.company_address || ''

    if (!fromEmail) {
      return NextResponse.json(
        { error: 'From email not configured in settings' },
        { status: 400 }
      )
    }

    // Get base URL for tracking - ensure it's properly set
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || 'http://localhost:3000'
    console.log('Using base URL for tracking:', baseUrl)

    // Create template snapshot to preserve exact content that was sent
    const templateSnapshot = {
      name: template.metadata.name,
      subject: template.metadata.subject,
      content: template.metadata.content,
      template_type: template.metadata.template_type,
      snapshot_date: new Date().toISOString(),
      original_template_id: template.id
    }

    // Update campaign status to 'Sending' and save template snapshot
    await updateCampaignStatus(id, 'Sent', {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }, templateSnapshot)

    // Send emails and track results
    const results = await Promise.allSettled(
      recipientEmails.map(async (email) => {
        try {
          // Get contact for personalization
          const contact = targetContacts.find(c => c.metadata?.email === email)
          if (!contact) {
            throw new Error('Contact not found for email: ' + email)
          }

          const firstName = contact.metadata?.first_name || 'there'
          const contactId = contact.id

          // Personalize content using the template snapshot
          let personalizedContent = templateSnapshot.content
          personalizedContent = personalizedContent.replace(/\{\{first_name\}\}/g, firstName)

          // Personalize subject using the template snapshot
          let personalizedSubject = templateSnapshot.subject
          personalizedSubject = personalizedSubject.replace(/\{\{first_name\}\}/g, firstName)

          // Add unsubscribe link
          const unsubscribeUrl = `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&campaign=${id}`
          const unsubscribeFooter = `
            <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              <p style="margin: 0 0 10px 0;">
                You received this email because you subscribed to our mailing list.
              </p>
              <p style="margin: 0 0 10px 0;">
                <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from future emails.
              </p>
              ${companyAddress ? `<p style="margin: 0; font-size: 11px;">${companyAddress.replace(/\n/g, '<br>')}</p>` : ''}
            </div>
          `

          personalizedContent += unsubscribeFooter

          // Add click tracking to email content
          console.log('Adding tracking for contact:', contactId, 'campaign:', id)
          const trackedContent = addTrackingToEmail(
            personalizedContent,
            id, // campaignId
            contactId, // contactId
            baseUrl // baseUrl for tracking endpoints
          )

          // Create proper SendEmailOptions with required text field
          const emailOptions = {
            from: `${fromName} <${fromEmail}>`,
            to: [email],
            subject: personalizedSubject, // Use personalized subject from snapshot
            html: trackedContent, // Use tracked content with click tracking
            text: trackedContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            reply_to: replyToEmail,
            headers: {
              'X-Campaign-ID': id,
              'X-Contact-Email': email,
              'X-Contact-ID': contactId,
              // Additional headers for better deliverability
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          }

          console.log('Sending email to:', email, 'with tracking enabled')
          
          // Send email with proper type handling
          const result = await sendEmail(emailOptions)
          
          // Type assertion with proper validation
          if (result && typeof result === 'object' && 'id' in result) {
            const typedResult = result as ResendSuccessResponse
            console.log('Email sent successfully to:', email, 'Message ID:', typedResult.id)
            return { success: true, email, messageId: typedResult.id }
          } else {
            throw new Error('Invalid response from email service')
          }
        } catch (error: any) {
          console.error(`Failed to send email to ${email}:`, error)
          return { success: false, email, error: error.message }
        }
      })
    )

    // Calculate final stats with proper null checks
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length

    console.log(`Campaign send completed: ${successful} successful, ${failed} failed`)

    // Ensure stats properties are never undefined
    const currentStats = campaign.metadata?.stats || {}
    const finalStats: CampaignStats = {
      sent: successful,
      delivered: successful, // Assume delivered if sent successfully
      opened: currentStats.opened || 0,
      clicked: currentStats.clicked || 0,
      bounced: failed,
      unsubscribed: currentStats.unsubscribed || 0,
      open_rate: successful > 0 ? `${Math.round((currentStats.opened || 0) / successful * 100)}%` : '0%',
      click_rate: successful > 0 ? `${Math.round((currentStats.clicked || 0) / successful * 100)}%` : '0%'
    }

    // Update final campaign status with preserved template snapshot
    await updateCampaignStatus(id, 'Sent', finalStats, templateSnapshot)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully to ${successful} recipients`,
      stats: {
        sent: successful,
        failed: failed,
        total: recipientEmails.length
      }
    })

  } catch (error: any) {
    console.error('Campaign send error:', error)
    
    // Try to update campaign status to failed if we have the ID
    try {
      const { id } = await params
      if (id) {
        await updateCampaignStatus(id, 'Draft')
      }
    } catch (statusUpdateError) {
      console.error('Failed to update campaign status after error:', statusUpdateError)
    }

    return NextResponse.json(
      { 
        error: error.message || 'Failed to send campaign',
        details: 'Check server logs for more information'
      },
      { status: 500 }
    )
  }
}