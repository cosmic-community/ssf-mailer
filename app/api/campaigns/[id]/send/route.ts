// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus } from '@/lib/cosmic'
import { sendBulkEmail } from '@/lib/resend'
import { EmailContact, MarketingCampaign } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Fetch the campaign
    const campaign = await getMarketingCampaign(id) as MarketingCampaign | null
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign can be sent
    if (campaign.metadata.status.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be sent' },
        { status: 400 }
      )
    }

    // Check if campaign has template and contacts
    if (!campaign.metadata.template || (!campaign.metadata.target_contacts?.length && !campaign.metadata.target_tags?.length)) {
      return NextResponse.json(
        { error: 'Campaign must have a template and target contacts' },
        { status: 400 }
      )
    }

    // Update campaign status to sending
    await updateCampaignStatus(id, 'Sending')

    // Prepare contacts for email sending
    const contacts = campaign.metadata.target_contacts || []
    const emailContacts = contacts
      .filter((contact: EmailContact) => contact.metadata?.status?.value === 'Active')
      .map((contact: EmailContact) => ({
        email: contact.metadata.email,
        firstName: contact.metadata.first_name,
        lastName: contact.metadata.last_name
      }))

    if (emailContacts.length === 0) {
      await updateCampaignStatus(id, 'Draft')
      return NextResponse.json(
        { error: 'No active contacts found to send to' },
        { status: 400 }
      )
    }

    // Send emails
    const template = {
      subject: campaign.metadata.template.metadata.subject,
      content: campaign.metadata.template.metadata.content
    }

    const emailResult = await sendBulkEmail(
      emailContacts,
      template,
      process.env.FROM_EMAIL || 'noreply@yourdomain.com'
    )

    // Calculate statistics
    const stats = {
      sent: emailResult.sent,
      delivered: emailResult.sent, // Assume delivered equals sent for now
      opened: 0,
      clicked: 0,
      bounced: emailResult.failed,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    // Update campaign with final status and stats
    await updateCampaignStatus(id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: 'Campaign sent successfully',
      stats: {
        sent: emailResult.sent,
        failed: emailResult.failed,
        errors: emailResult.errors
      }
    })

  } catch (error) {
    console.error('Campaign sending error:', error)
    
    // Try to update campaign status back to draft on error
    try {
      const { id } = await params
      await updateCampaignStatus(id, 'Draft')
    } catch (updateError) {
      console.error('Failed to update campaign status on error:', updateError)
    }
    
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}