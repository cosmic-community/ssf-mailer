import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')
    const method = searchParams.get('m') // tracking method (img, bg, alt, etc.)
    const timestamp = searchParams.get('t')

    console.log('=== OPEN TRACKING REQUEST ===')
    console.log('Campaign ID:', campaignId)
    console.log('Contact ID:', contactId)
    console.log('Method:', method)
    console.log('Timestamp:', timestamp)
    console.log('Full URL:', request.url)

    // Generate tracking pixel data (1x1 transparent GIF)
    const pixelData = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    // If campaignId is provided, track the open event
    if (campaignId) {
      try {
        console.log('Processing open tracking for campaign:', campaignId)
        
        // Find the campaign to get current stats
        const { object: campaign } = await cosmic.objects
          .findOne({ type: 'marketing-campaigns', id: campaignId })
          .props(['id', 'title', 'metadata'])
          .depth(1)
        
        if (campaign) {
          console.log('✅ Campaign found:', campaign.title)
          console.log('Current campaign status:', campaign.metadata?.status?.value)
          console.log('Current stats before update:', JSON.stringify(campaign.metadata?.stats, null, 2))
          
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

          // Increment opened count
          const newOpened = (currentStats.opened || 0) + 1
          const sent = currentStats.sent || 1 // Prevent division by zero

          // Calculate new open rate
          const newOpenRate = sent > 0 ? Math.round((newOpened / sent) * 100) : 0

          // Update stats with new open data
          const updatedStats = {
            ...currentStats,
            opened: newOpened,
            open_rate: `${newOpenRate}%`
          }

          console.log('📊 Updated stats to save:', JSON.stringify(updatedStats, null, 2))

          // Update campaign stats in Cosmic - only update the stats field
          const updateResult = await cosmic.objects.updateOne(campaignId, {
            metadata: {
              stats: updatedStats
            }
          })

          if (updateResult?.object) {
            console.log('✅ Campaign stats updated successfully!')
            console.log('New opened count:', newOpened)
            console.log('New open rate:', `${newOpenRate}%`)
          } else {
            console.error('❌ Failed to update campaign stats - no object returned')
          }
        } else {
          console.error('❌ Campaign not found for ID:', campaignId)
        }
      } catch (error) {
        console.error('❌ Error tracking open event:', error)
        if (error && typeof error === 'object') {
          console.error('Error details:', JSON.stringify(error, null, 2))
        }
        // Don't fail the pixel request if tracking fails
      }
    } else {
      console.log('⚠️  No campaign ID provided, skipping tracking')
    }

    console.log('=== END OPEN TRACKING ===')

    // Always return the tracking pixel with proper headers
    return new NextResponse(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Expires': '0',
        'Pragma': 'no-cache',
        'Content-Length': pixelData.length.toString()
      },
    })

  } catch (error) {
    console.error('❌ Critical error in open tracking:', error)
    if (error && typeof error === 'object') {
      console.error('Error stack:', error.stack)
    }
    
    // Still return tracking pixel even if there's an error
    const pixelData = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    
    return new NextResponse(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Content-Length': pixelData.length.toString()
      },
    })
  }
}