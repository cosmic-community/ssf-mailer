import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('contact')

    console.log('Open tracking request:', { campaignId, contactId })

    if (!campaignId) {
      console.log('No campaign ID provided for open tracking')
      // Return a 1x1 transparent GIF even if tracking fails
      const gif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      )
      
      return new NextResponse(gif, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Get the current campaign to retrieve existing stats
    const { object: campaign } = await cosmic.objects
      .findOne({ type: 'marketing-campaigns', id: campaignId })
      .props(['id', 'metadata'])
      .depth(1)

    if (!campaign) {
      console.log('Campaign not found:', campaignId)
      // Return tracking pixel even if campaign not found
      const gif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      )
      
      return new NextResponse(gif, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    console.log('Campaign found for open tracking:', campaign.id, campaign.metadata?.name)

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

    console.log('Current stats before update:', currentStats)

    // Increment the opened count
    const newOpenedCount = (currentStats.opened || 0) + 1
    const sentCount = currentStats.sent || 0
    
    // Calculate new open rate
    const newOpenRate = sentCount > 0 
      ? `${Math.round((newOpenedCount / sentCount) * 100)}%`
      : '0%'

    const updatedStats = {
      ...currentStats,
      opened: newOpenedCount,
      open_rate: newOpenRate
    }

    console.log('Updated stats to save:', updatedStats)

    // Update only the stats in the campaign metadata
    await cosmic.objects.updateOne(campaignId, {
      metadata: {
        stats: updatedStats
      }
    })

    console.log('Open tracking updated successfully for campaign:', campaignId)
    console.log('New opened count:', newOpenedCount, 'New open rate:', newOpenRate)

    // Return a 1x1 transparent GIF
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    
    return new NextResponse(gif, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error in open tracking:', error)
    
    // Always return a tracking pixel even if there's an error
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    
    return new NextResponse(gif, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}