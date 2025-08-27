// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateCampaignStatus, getMarketingCampaign } from '@/lib/cosmic'
import { sendCampaignEmails } from '@/lib/resend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the campaign details
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
        { error: 'Campaign can only be sent from Draft status' },
        { status: 400 }
      )
    }

    // Check if campaign has recipients
    const hasContacts = campaign.metadata?.target_contacts && campaign.metadata.target_contacts.length > 0
    const hasTags = campaign.metadata?.target_tags && campaign.metadata.target_tags.length > 0
    
    if (!hasContacts && !hasTags) {
      return NextResponse.json(
        { error: 'Campaign must have target contacts or tags' },
        { status: 400 }
      )
    }

    // Update status to "Sending" first
    await updateCampaignStatus(id, 'Sending')

    try {
      // Send the emails
      const emailResults = await sendCampaignEmails(campaign)
      
      // Calculate stats
      const stats = {
        sent: emailResults.successful,
        delivered: emailResults.successful, // Assume all sent emails are delivered for now
        opened: 0,
        clicked: 0,
        bounced: emailResults.failed,
        unsubscribed: 0,
        open_rate: '0.0%',
        click_rate: '0.0%'
      }
      
      // Update status to "Sent" with stats
      await updateCampaignStatus(id, 'Sent', stats)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Campaign sent successfully',
        stats 
      })
      
    } catch (sendError) {
      console.error('Error sending campaign emails:', sendError)
      
      // Update status back to "Draft" if sending failed
      await updateCampaignStatus(id, 'Draft')
      
      return NextResponse.json(
        { error: 'Failed to send campaign emails' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Error in send campaign API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}