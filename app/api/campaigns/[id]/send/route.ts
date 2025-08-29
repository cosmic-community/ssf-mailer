// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, getEmailContacts, updateCampaignStatus, getSettings } from '@/lib/cosmic'
import { sendEmail } from '@/lib/resend'
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

    // Get target contacts - Fix: Extract email addresses from contact objects
    const targetContacts = campaign.metadata?.target_contacts || []
    if (!Array.isArray(targetContacts) || targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No target contacts found for this campaign' },
        { status: 400 }
      )
    }

    // Fix: Extract email addresses from contact objects instead of trying to convert objects to strings
    const recipientEmails: string[] = targetContacts
      .filter((contact): contact is EmailContact => 
        contact && 
        typeof contact === 'object' && 
        'metadata' in contact && 
        contact.metadata && 
        typeof contact.metadata.email === 'string' &&
        contact.metadata.status?.value === 'Active'
      )
      .map((contact: EmailContact) => contact.metadata.email)

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: 'No active contacts found to send to' },
        { status: 400 }
      )
    }

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

    // Update campaign status to 'Sending'
    await updateCampaignStatus(id, 'Sent', {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    })

    // Send emails and track results
    const results = await Promise.allSettled(
      recipientEmails.map(async (email) => {
        try {
          // Get contact for personalization
          const contact = targetContacts.find(c => 
            c && 
            typeof c === 'object' && 
            'metadata' in c && 
            c.metadata?.email === email
          ) as EmailContact | undefined

          const firstName = contact?.metadata?.first_name || 'there'

          // Personalize content
          let personalizedContent = template.metadata.content
          personalizedContent = personalizedContent.replace(/\{\{first_name\}\}/g, firstName)

          // Add unsubscribe link
          const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(email)}&campaign=${id}`
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

          // Fix: Create proper SendEmailOptions with required text field
          const emailOptions = {
            from: `${fromName} <${fromEmail}>`,
            to: [email],
            subject: template.metadata.subject,
            html: personalizedContent,
            text: personalizedContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            reply_to: replyToEmail,
            headers: {
              'X-Campaign-ID': id,
              'X-Contact-Email': email
            }
          }

          // Fix: Proper type handling for Resend response
          const result = await sendEmail(emailOptions)
          
          // Fix: Type assertion with proper validation
          if (result && typeof result === 'object' && 'id' in result) {
            const typedResult = result as ResendSuccessResponse
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

    // Fix: Ensure stats properties are never undefined
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

    // Update final campaign status
    await updateCampaignStatus(id, 'Sent', finalStats)

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