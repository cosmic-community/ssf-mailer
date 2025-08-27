// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus } from '@/lib/cosmic'
import { sendEmail } from '@/lib/resend'
import { EmailContact } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required in Next.js 15+
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
    if (campaign.metadata?.status?.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Campaign has already been sent or is not in draft status' },
        { status: 400 }
      )
    }

    // Check if we have a template
    if (!campaign.metadata?.template) {
      return NextResponse.json(
        { error: 'Campaign does not have a template' },
        { status: 400 }
      )
    }

    // Get target contacts
    const targetContacts = campaign.metadata?.target_contacts || []
    
    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no target contacts' },
        { status: 400 }
      )
    }

    // Send emails to each contact with proper TypeScript typing
    const emailResults = []
    const errors = []

    for (const contact of targetContacts as EmailContact[]) {
      try {
        // Replace template placeholders with contact data
        let emailContent = campaign.metadata.template.metadata?.content || ''
        let emailSubject = campaign.metadata.template.metadata?.subject || ''

        // Replace placeholders
        emailContent = emailContent.replace(/\{\{first_name\}\}/g, contact.metadata?.first_name || '')
        emailContent = emailContent.replace(/\{\{last_name\}\}/g, contact.metadata?.last_name || '')
        emailContent = emailContent.replace(/\{\{email\}\}/g, contact.metadata?.email || '')

        emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, contact.metadata?.first_name || '')
        emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, contact.metadata?.last_name || '')

        // Send email
        const result = await sendEmail({
          to: contact.metadata?.email || '',
          subject: emailSubject,
          html: emailContent
        })

        emailResults.push({
          contactId: contact.id,
          email: contact.metadata?.email,
          success: result.success,
          messageId: result.messageId
        })

      } catch (error) {
        console.error(`Error sending email to ${contact.metadata?.email}:`, error)
        errors.push({
          contactId: contact.id,
          email: contact.metadata?.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Calculate stats
    const successful = emailResults.filter(r => r.success)
    const failed = emailResults.filter(r => !r.success) 

    const stats = {
      sent: successful.length,
      delivered: successful.length, // Assume delivered = sent for now
      opened: 0,
      clicked: 0,
      bounced: failed.length,
      unsubscribed: 0,
      open_rate: "0%",
      click_rate: "0%"
    }

    // Update campaign status to 'Sent'
    await updateCampaignStatus(id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: `Campaign sent to ${successful.length} contacts`,
      stats,
      results: emailResults,
      errors
    })

  } catch (error) {
    console.error('Error sending campaign:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}