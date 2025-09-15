// app/api/campaigns/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { MarketingCampaign } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // First, fetch the original campaign
    const { object: originalCampaign } = await cosmic.objects.findOne({
      id: id,
      type: 'marketing-campaigns'
    }).depth(1) as { object: MarketingCampaign }

    if (!originalCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Create a new campaign name with "(Copy)" suffix
    const originalName = originalCampaign.metadata?.name || originalCampaign.title
    const copyName = `${originalName} (Copy)`

    // Create the duplicate campaign with proper metadata structure
    // Reset status to Draft and clear stats/sending progress
    const duplicatedCampaign = await cosmic.objects.insertOne({
      title: copyName,
      type: 'marketing-campaigns',
      metadata: {
        name: copyName,
        template: originalCampaign.metadata?.template || '',
        target_lists: originalCampaign.metadata?.target_lists || [],
        target_contacts: originalCampaign.metadata?.target_contacts || [],
        target_tags: originalCampaign.metadata?.target_tags || [],
        status: {
          key: 'draft',
          value: 'Draft'
        },
        send_date: '', // Clear the send date for the duplicate
        // Note: stats, sending_progress, and template_snapshot are excluded for fresh start
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: duplicatedCampaign,
      message: `Campaign "${originalName}" duplicated successfully as "${copyName}"`
    })
  } catch (error: any) {
    console.error('Error duplicating campaign:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate campaign' },
      { status: 500 }
    )
  }
}