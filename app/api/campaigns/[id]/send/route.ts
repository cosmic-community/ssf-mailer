// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, getEmailContacts, updateCampaignStatus, getSettings, getEmailTemplate } from '@/lib/cosmic'
import { resend } from '@/lib/resend'
import { addTrackingToEmail, extractTextFromHtml, createUnsubscribeUrl } from '@/lib/email-tracking'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
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

    // Get the email template
    let template = null
    if (campaign.metadata?.template_id) {
      template = await getEmailTemplate(campaign.metadata.template_id)
    } else if (campaign.metadata?.template && typeof campaign.metadata.template === 'object') {
      template = campaign.metadata.template
    }

    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      )
    }

    // Get settings for sender information
    const settings = await getSettings()
    if (!settings?.metadata?.from_email) {
      return NextResponse.json(
        { error: 'Sender email not configured in settings' },
        { status: 400 }
      )
    }

    // Get target contacts
    let targetContacts = []
    
    if (campaign.metadata?.target_contacts && Array.isArray(campaign.metadata.target_contacts)) {
      // Handle both contact objects and contact IDs
      for (const contact of campaign.metadata.target_contacts) {
        if (typeof contact === 'string') {
          // It's a contact ID, fetch the contact
          const allContacts = await getEmailContacts()
          const foundContact = allContacts.find(c => c.id === contact)
          if (foundContact && foundContact.metadata?.status?.value === 'Active') {
            targetContacts.push(foundContact)
          }
        } else if (contact && contact.metadata?.email) {
          // It's a contact object
          if (contact.metadata?.status?.value === 'Active') {
            targetContacts.push(contact)
          }
        }
      }
    }

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No active contacts found for this campaign' },
        { status: 400 }
      )
    }

    // Prepare email details
    const fromEmail = settings.metadata.from_email
    const fromName = settings.metadata.from_name || 'Email Marketing'
    const replyToEmail = settings.metadata.reply_to_email || fromEmail
    const subject = template.metadata?.subject || 'Newsletter'
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'http://localhost:3000'

    let emailsSent = 0
    let emailsDelivered = 0
    let emailsBounced = 0

    // Send emails to all target contacts
    for (const contact of targetContacts) {
      try {
        if (!contact.metadata?.email) {
          console.warn(`Contact ${contact.id} has no email address`)
          continue
        }

        // Personalize the email content
        let personalizedContent = template.metadata?.content || ''
        
        // Replace common placeholders
        personalizedContent = personalizedContent
          .replace(/\{\{first_name\}\}/g, contact.metadata.first_name || 'Friend')
          .replace(/\{\{last_name\}\}/g, contact.metadata.last_name || '')
          .replace(/\{\{email\}\}/g, contact.metadata.email || '')

        // Add tracking to the email
        const trackedContent = addTrackingToEmail(
          personalizedContent,
          campaign.id,
          contact.id,
          baseUrl
        )

        // Add unsubscribe link
        const unsubscribeUrl = createUnsubscribeUrl(contact.metadata.email, baseUrl)
        const contentWithUnsubscribe = trackedContent + `
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
            <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.</p>
          </div>
        `

        // Send the email
        const result = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: contact.metadata.email,
          subject: subject,
          html: contentWithUnsubscribe,
          text: extractTextFromHtml(contentWithUnsubscribe),
          reply_to: replyToEmail,
        })

        emailsSent++
        emailsDelivered++ // Assume delivered if no immediate error

        console.log(`Email sent successfully to ${contact.metadata.email}:`, result.id)
      } catch (error: any) {
        console.error(`Failed to send email to ${contact.metadata?.email}:`, error)
        emailsBounced++
        emailsSent++ // Still count as sent attempt
      }
    }

    // Update campaign stats and status
    const stats = {
      sent: emailsSent,
      delivered: emailsDelivered,
      opened: 0,
      clicked: 0,
      bounced: emailsBounced,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    await updateCampaignStatus(campaign.id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully to ${emailsDelivered} recipients`,
      stats: {
        sent: emailsSent,
        delivered: emailsDelivered,
        bounced: emailsBounced
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