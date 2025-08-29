// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, getEmailContacts, getSettings, updateCampaignStatus } from '@/lib/cosmic'
import { resend, ResendSuccessResponse, SendEmailOptions } from '@/lib/resend'
import { MarketingCampaign, EmailContact, CampaignStats } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the campaign
    const campaign = await getMarketingCampaign(id)
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign is in draft status
    if (campaign.metadata.status?.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Campaign must be in draft status to send' },
        { status: 400 }
      )
    }

    // Get the template (it should be populated from the campaign fetch)
    const template = campaign.metadata.template
    if (!template || typeof template !== 'object') {
      return NextResponse.json(
        { error: 'Campaign template not found' },
        { status: 400 }
      )
    }

    // Get target contacts
    let contacts: EmailContact[] = []
    if (campaign.metadata.target_contacts && campaign.metadata.target_contacts.length > 0) {
      // If target_contacts is populated as objects, use them directly
      if (typeof campaign.metadata.target_contacts[0] === 'object') {
        contacts = campaign.metadata.target_contacts as EmailContact[]
      } else {
        // If they're just IDs, we'd need to fetch the contacts
        // For now, get all contacts and filter
        const allContacts = await getEmailContacts()
        const targetIds = campaign.metadata.target_contacts as string[]
        contacts = allContacts.filter(contact => targetIds.includes(contact.id))
      }
    } else {
      // If no specific contacts, get all active contacts
      const allContacts = await getEmailContacts()
      contacts = allContacts.filter(contact => 
        contact.metadata.status?.value === 'Active'
      )
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No active contacts found to send to' },
        { status: 400 }
      )
    }

    // Get settings for sender information
    const settings = await getSettings()
    if (!settings || !settings.metadata.from_email) {
      return NextResponse.json(
        { error: 'Email settings not configured. Please configure sender settings first.' },
        { status: 400 }
      )
    }

    // Initialize stats
    const stats: CampaignStats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    // Send emails to all contacts
    const emailPromises = contacts.map(async (contact) => {
      try {
        // Personalize the email content
        let personalizedContent = template.metadata?.content || ''
        let personalizedSubject = template.metadata?.subject || ''

        // Replace placeholders with contact data
        personalizedContent = personalizedContent
          .replace(/\{\{first_name\}\}/g, contact.metadata.first_name || 'there')
          .replace(/\{\{last_name\}\}/g, contact.metadata.last_name || '')
          .replace(/\{\{email\}\}/g, contact.metadata.email || '')

        personalizedSubject = personalizedSubject
          .replace(/\{\{first_name\}\}/g, contact.metadata.first_name || 'there')
          .replace(/\{\{last_name\}\}/g, contact.metadata.last_name || '')

        // Add tracking pixels and unsubscribe links
        const baseUrl = request.url.split('/api')[0]
        const trackingPixel = `<img src="${baseUrl}/api/track/open?campaign=${campaign.id}&contact=${contact.id}" width="1" height="1" style="display:none;" />`
        const unsubscribeLink = `<p style="font-size: 12px; color: #666; text-align: center; margin-top: 20px;">
          <a href="${baseUrl}/api/unsubscribe?email=${encodeURIComponent(contact.metadata.email)}" style="color: #666;">Unsubscribe</a>
        </p>`

        // Add tracking and unsubscribe to content
        personalizedContent = personalizedContent + trackingPixel + unsubscribeLink

        // Prepare email options
        const emailOptions: SendEmailOptions = {
          from: `${settings.metadata.from_name} <${settings.metadata.from_email}>`,
          to: contact.metadata.email,
          subject: personalizedSubject,
          html: personalizedContent,
          reply_to: settings.metadata.reply_to_email || settings.metadata.from_email
        }

        // Send the email
        const response = await resend.emails.send(emailOptions)
        
        // Type assertion to ensure we have the correct response type
        const emailResponse = response as ResendSuccessResponse

        stats.sent++
        
        return {
          contactId: contact.id,
          email: contact.metadata.email,
          success: true,
          messageId: emailResponse.id // Now TypeScript knows this property exists
        }
      } catch (error) {
        console.error(`Failed to send email to ${contact.metadata.email}:`, error)
        stats.bounced++
        
        return {
          contactId: contact.id,
          email: contact.metadata.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    })

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises)
    
    // Calculate delivered count (successful sends)
    stats.delivered = results.filter(r => r.success).length
    
    // Update campaign status to sent
    await updateCampaignStatus(campaign.id, 'Sent', stats)

    // Return results
    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully to ${stats.delivered} recipients`,
      stats,
      results: results.map(r => ({
        email: r.email,
        success: r.success,
        error: r.success ? undefined : r.error
      }))
    })

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}