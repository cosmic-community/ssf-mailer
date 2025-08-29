import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')

    // Create the 1x1 transparent tracking pixel response
    const pixelBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    const pixelResponse = new NextResponse(pixelBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': pixelBuffer.length.toString(),
        // Add CORS headers to ensure the pixel loads properly
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        // Add security headers
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
      }
    })

    // If we don't have required parameters, still return the pixel but don't track
    if (!campaignId || !contactId) {
      console.log('Open tracking pixel served but missing required parameters:', { campaignId, contactId })
      return pixelResponse
    }

    // Record the open event asynchronously (don't block the pixel response)
    recordOpenEvent(campaignId, contactId).catch(error => {
      console.error('Error recording open event (async):', error)
    })

    return pixelResponse
  } catch (error) {
    console.error('Open tracking error:', error)
    
    // Always return a tracking pixel, even on error
    const pixelBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    return new NextResponse(pixelBuffer, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': pixelBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
      }
    })
  }
}

// Separate async function to record the open event
async function recordOpenEvent(campaignId: string, contactId: string) {
  try {
    console.log('Recording open event for campaign:', campaignId, 'contact:', contactId)

    const campaign = await cosmic.objects.findOne({ 
      id: campaignId, 
      type: 'marketing-campaigns' 
    }).props(['id', 'metadata']).depth(1)

    if (!campaign.object) {
      console.error('Campaign not found for open tracking:', campaignId)
      return
    }

    const currentStats = campaign.object.metadata?.stats || {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    const newOpened = (currentStats.opened || 0) + 1
    const sentCount = currentStats.sent || 0
    
    const newStats = {
      sent: sentCount,
      delivered: currentStats.delivered || 0,
      opened: newOpened,
      clicked: currentStats.clicked || 0,
      bounced: currentStats.bounced || 0,
      unsubscribed: currentStats.unsubscribed || 0,
      open_rate: sentCount > 0 ? `${Math.round((newOpened / sentCount) * 100)}%` : '0%',
      click_rate: sentCount > 0 ? `${Math.round((currentStats.clicked || 0) / sentCount * 100)}%` : '0%'
    }

    console.log('Updating campaign stats:', { oldStats: currentStats, newStats })

    // Update campaign stats - only include the stats field
    await cosmic.objects.updateOne(campaignId, {
      metadata: {
        stats: newStats
      }
    })

    console.log('Open event recorded successfully for campaign:', campaignId)
  } catch (error) {
    console.error('Failed to record open event:', error)
    throw error
  }
}