import { NextRequest, NextResponse } from 'next/server'
import { getEmailCampaign, updateCampaignStatus } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')
    const url = searchParams.get('url')
    const timestamp = searchParams.get('t')

    console.log('Open tracking request:', {
      campaignId,
      contactId,
      url,
      timestamp
    })

    // Generate tracking pixel data (1x1 transparent GIF)
    const pixelData = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    // If campaignId is provided, track the open event
    if (campaignId) {
      try {
        // Find the campaign to get current stats
        const campaign = await getEmailCampaign(campaignId)
        
        if (campaign) {
          console.log('Campaign found for open tracking:', campaignId)
          console.log('Current stats before open update:', campaign.metadata.stats)
          
          // Get current stats or initialize with defaults
          const currentStats = campaign.metadata.stats || {
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

          console.log('New stats after click update:', updatedStats)

          // Update campaign stats in Cosmic
          const updatedCampaign = await updateCampaignStatus(
            campaignId,
            campaign.metadata.status.value as 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Paused',
            updatedStats
          )

          if (updatedCampaign) {
            console.log('Campaign stats updated successfully for open tracking')
          } else {
            console.error('Failed to update campaign stats for open tracking')
          }
        } else {
          console.log('Campaign not found for open tracking:', campaignId)
        }
      } catch (error) {
        console.error('Error tracking open event:', error)
        // Don't fail the pixel request if tracking fails
      }
    }

    // Always return the tracking pixel
    return new NextResponse(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Expires': '0',
        'Pragma': 'no-cache'
      },
    })

  } catch (error) {
    console.error('Open tracking error:', error)
    
    // Still return tracking pixel even if there's an error
    const pixelData = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )
    
    return new NextResponse(pixelData, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private'
      },
    })
  }
}