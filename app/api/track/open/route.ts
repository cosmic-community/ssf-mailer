import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const campaignId = searchParams.get('c')
  const contactId = searchParams.get('u')
  
  try {
    // Track the open if campaign and contact IDs are provided
    if (campaignId && contactId) {
      try {
        // Get the campaign to update open stats
        const { object: campaign } = await cosmic.objects
          .findOne({ type: 'marketing-campaigns', id: campaignId })
          .props(['id', 'metadata'])
          .depth(1)

        if (campaign && campaign.metadata?.stats) {
          const currentStats = campaign.metadata.stats
          const newOpenCount = (currentStats.opened || 0) + 1
          const sentCount = currentStats.sent || 0
          
          // Update open stats
          await cosmic.objects.updateOne(campaignId, {
            metadata: {
              stats: {
                ...currentStats,
                opened: newOpenCount,
                open_rate: sentCount > 0 ? `${Math.round((newOpenCount / sentCount) * 100)}%` : '0%'
              }
            }
          })
        }
        
        console.log(`Open tracked: Campaign ${campaignId}, Contact ${contactId}`)
      } catch (trackingError) {
        // Log tracking errors but don't prevent pixel response
        console.error('Error tracking open:', trackingError)
      }
    }
    
    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    // Fix TS2339: Add proper error type checking
    console.error('Error in open tracking:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    
    // Still return the tracking pixel even if there's an error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    )
    
    return new NextResponse(pixel, {
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