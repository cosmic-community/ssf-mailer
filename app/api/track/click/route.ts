import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')
    const url = searchParams.get('url')

    if (!campaignId || !contactId || !url) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Record the click event
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

        const newClicked = (currentStats.clicked || 0) + 1
        const newStats = {
          ...currentStats,
          clicked: newClicked,
          click_rate: currentStats.sent > 0 ? 
            `${Math.round((newClicked / currentStats.sent) * 100)}%` : '0%'
        }

        // Update campaign stats - only include the stats field
        await cosmic.objects.updateOne(campaignId, {
          metadata: {
            stats: newStats
          }
        })
      }
    } catch (error) {
      console.error('Error recording click event:', error)
      // Continue with redirect even if tracking fails
    }

    // Decode the URL and redirect
    const decodedUrl = decodeURIComponent(url)
    
    // Validate URL to prevent open redirects
    try {
      new URL(decodedUrl) // This will throw if URL is invalid
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      )
    }

    return NextResponse.redirect(decodedUrl)
  } catch (error) {
    console.error('Click tracking error:', error)
    return NextResponse.json(
      { error: 'Tracking failed' },
      { status: 500 }
    )
  }
}