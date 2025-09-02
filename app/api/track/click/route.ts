import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('contact')
    const url = searchParams.get('url')

    console.log('Click tracking request:', { campaignId, contactId, url })

    if (!url) {
      return NextResponse.redirect('/')
    }

    if (!campaignId) {
      console.log('No campaign ID provided for click tracking')
      return NextResponse.redirect(url)
    }

    // Get the current campaign to retrieve existing stats
    const { object: campaign } = await cosmic.objects
      .findOne({ type: 'marketing-campaigns', id: campaignId })
      .props(['id', 'metadata'])
      .depth(1)

    if (!campaign) {
      console.log('Campaign not found:', campaignId)
      return NextResponse.redirect(url)
    }

    console.log('Campaign found for click tracking:', campaign.id, campaign.metadata?.name)

    // Get current stats or initialize with defaults
    const currentStats = campaign.metadata?.stats || {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    console.log('Current stats before click update:', currentStats)

    // Increment the clicked count
    const newClickedCount = (currentStats.clicked || 0) + 1
    const sentCount = currentStats.sent || 0
    
    // Calculate new click rate
    const newClickRate = sentCount > 0 
      ? `${Math.round((newClickedCount / sentCount) * 100)}%`
      : '0%'

    const updatedStats = {
      ...currentStats,
      clicked: newClickedCount,
      click_rate: newClickRate
    }

    console.log('Updated stats to save:', updatedStats)

    // Update only the stats in the campaign metadata
    await cosmic.objects.updateOne(campaignId, {
      metadata: {
        stats: updatedStats
      }
    })

    console.log('Click tracking updated successfully for campaign:', campaignId)
    console.log('New clicked count:', newClickedCount, 'New click rate:', newClickRate)

    // Redirect to the original URL
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('Error in click tracking:', error)
    
    // Redirect to the original URL even if tracking fails
    const url = new URL(request.url).searchParams.get('url')
    return NextResponse.redirect(url || '/')
  }
}