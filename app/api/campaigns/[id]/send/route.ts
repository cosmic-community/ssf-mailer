// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmailCampaign, updateCampaignStatus, getEmailTemplate } from '@/lib/cosmic'
import { TemplateSnapshot } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Get the campaign
    const campaign = await getEmailCampaign(id)
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const currentStatus = campaign.metadata.status?.value || 'Draft'
    
    // Validate campaign can be sent
    if (currentStatus === 'Sent') {
      return NextResponse.json(
        { error: 'Campaign has already been sent' },
        { status: 400 }
      )
    }

    if (currentStatus === 'Sending') {
      return NextResponse.json(
        { error: 'Campaign is currently being sent' },
        { status: 400 }
      )
    }

    // Validate campaign has targets - FIXED: Include target_lists check
    const hasLists = campaign.metadata.target_lists && campaign.metadata.target_lists.length > 0
    const hasContacts = campaign.metadata.target_contacts && campaign.metadata.target_contacts.length > 0
    const hasTags = campaign.metadata.target_tags && campaign.metadata.target_tags.length > 0
    
    if (!hasLists && !hasContacts && !hasTags) {
      return NextResponse.json(
        { error: 'Campaign has no target recipients' },
        { status: 400 }
      )
    }

    // Validate template exists and create snapshot
    let templateSnapshot: TemplateSnapshot | undefined
    const templateId = typeof campaign.metadata.template === 'string' 
      ? campaign.metadata.template 
      : campaign.metadata.template?.id

    if (templateId) {
      const template = await getEmailTemplate(templateId)
      if (!template) {
        return NextResponse.json(
          { error: 'Campaign template not found' },
          { status: 400 }
        )
      }

      // Create template snapshot to preserve content at time of sending
      templateSnapshot = {
        name: template.metadata.name,
        subject: template.metadata.subject,
        content: template.metadata.content,
        template_type: template.metadata.template_type,
        snapshot_date: new Date().toISOString(),
        original_template_id: template.id
      }
    }

    // Update campaign status to "Sending" with template snapshot
    await updateCampaignStatus(id, 'Sending', {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }, templateSnapshot)

    return NextResponse.json({
      success: true,
      message: 'Campaign sending initiated. Emails will be sent in batches via background processing.'
    })

  } catch (error) {
    console.error('Campaign send initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate campaign sending' },
      { status: 500 }
    )
  }
}