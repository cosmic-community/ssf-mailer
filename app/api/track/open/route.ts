import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')

    if (!campaignId || !contactId) {
      // Return a 1x1 transparent pixel even for invalid requests
      return new NextResponse(
        Buffer.from(
          'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          'base64'
        ),
        {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Expires': '0'
          }
        }
      )
    }

    // Record the open event
    try {
      const campaign = await cosmic.objects.findOne({ 
        id: campaignId, 
        type: 'marketing-campaigns' 
      }).props(['id', 'metadata']).depth(1)

      if (campaign.object) {
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
        const newStats = {
          ...currentStats,
          opened: newOpened,
          open_rate: currentStats.sent > 0 ? 
            `${Math.round((newOpened / currentStats.sent) * 100)}%` : '0%'
        }

        // Update campaign stats - only include the stats field
        await cosmic.objects.updateOne(campaignId, {
          metadata: {
            stats: newStats
          }
        })
      }
    } catch (error) {
      console.error('Error recording open event:', error)
      // Continue to return pixel even if tracking fails
    }

    // Return a 1x1 transparent tracking pixel
    return new NextResponse(
      Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      ),
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Open tracking error:', error)
    
    // Always return a tracking pixel, even on error
    return new NextResponse(
      Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
      ),
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0'
        }
      }
    )
  }
}