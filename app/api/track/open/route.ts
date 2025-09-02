import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

// 1x1 transparent pixel image data
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('contact')

    if (!campaignId) {
      return new NextResponse(TRACKING_PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    try {
      // Get the current campaign to update open stats
      const { object: campaign } = await cosmic.objects.findOne({
        type: 'marketing-campaigns',
        id: campaignId
      }).props(['id', 'metadata'])

      if (campaign?.metadata?.stats) {
        const currentStats = campaign.metadata.stats
        const newOpenCount = (currentStats.opened || 0) + 1
        const totalSent = currentStats.sent || 1
        const newOpenRate = `${Math.round((newOpenCount / totalSent) * 100)}%`

        // Update campaign stats with new open data
        await cosmic.objects.updateOne(campaignId, {
          metadata: {
            stats: {
              ...currentStats,
              opened: newOpenCount,
              open_rate: newOpenRate
            }
          }
        })
      }
    } catch (statsError) {
      // Log stats update error but still return the pixel
      console.error('Error updating open stats:', statsError)
    }

    // Create tracking event (optional - for detailed analytics)
    try {
      await cosmic.objects.insertOne({
        type: 'email-tracking-events',
        title: `Open Event - ${new Date().toISOString()}`,
        status: 'published',
        metadata: {
          event_type: 'open',
          campaign_id: campaignId,
          contact_id: contactId,
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || '',
          ip_address: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
        }
      })
    } catch (trackingError) {
      // Log tracking error but still return the pixel
      console.error('Error creating tracking event:', trackingError)
    }

    // Return the tracking pixel
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    // Log the error but always return the tracking pixel to avoid broken images
    console.error('Error in open tracking:', error)
    
    return new NextResponse(TRACKING_PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}