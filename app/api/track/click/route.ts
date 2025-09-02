import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')
    const targetUrl = searchParams.get('url')
    const timestamp = searchParams.get('t')

    console.log('=== CLICK TRACKING REQUEST ===')
    console.log('Campaign ID:', campaignId)
    console.log('Contact ID:', contactId)
    console.log('Target URL:', targetUrl)
    console.log('Timestamp:', timestamp)

    if (!targetUrl) {
      console.error('❌ No target URL provided for click tracking')
      return NextResponse.redirect('/')
    }

    if (!campaignId) {
      console.log('⚠️  No campaign ID provided, redirecting without tracking')
      return NextResponse.redirect(targetUrl)
    }

    try {
      console.log('Processing click tracking for campaign:', campaignId)

      // Get the current campaign to retrieve existing stats
      const { object: campaign } = await cosmic.objects
        .findOne({ type: 'marketing-campaigns', id: campaignId })
        .props(['id', 'title', 'metadata'])
        .depth(1)

      if (!campaign) {
        console.error('❌ Campaign not found:', campaignId)
        return NextResponse.redirect(targetUrl)
      }

      console.log('✅ Campaign found for click tracking:', campaign.title)
      console.log('Current stats before click update:', JSON.stringify(campaign.metadata?.stats, null, 2))

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

      // Increment the clicked count
      const newClickedCount = (currentStats.clicked || 0) + 1
      const sentCount = currentStats.sent || 1 // Prevent division by zero
      
      // Calculate new click rate
      const newClickRate = sentCount > 0 
        ? Math.round((newClickedCount / sentCount) * 100)
        : 0

      const updatedStats = {
        ...currentStats,
        clicked: newClickedCount,
        click_rate: `${newClickRate}%`
      }

      console.log('📊 Updated stats to save:', JSON.stringify(updatedStats, null, 2))

      // Update only the stats in the campaign metadata
      const updateResult = await cosmic.objects.updateOne(campaignId, {
        metadata: {
          stats: updatedStats
        }
      })

      if (updateResult?.object) {
        console.log('✅ Click tracking updated successfully!')
        console.log('New clicked count:', newClickedCount)
        console.log('New click rate:', `${newClickRate}%`)
      } else {
        console.error('❌ Failed to update campaign stats - no object returned')
      }

    } catch (trackingError) {
      console.error('❌ Error in click tracking processing:', trackingError)
      if (trackingError && typeof trackingError === 'object') {
        console.error('Tracking error details:', JSON.stringify(trackingError, null, 2))
      }
    }

    console.log('=== END CLICK TRACKING ===')
    console.log('Redirecting to:', targetUrl)

    // Always redirect to the original URL, even if tracking fails
    return NextResponse.redirect(targetUrl)
  } catch (error) {
    console.error('❌ Critical error in click tracking:', error)
    if (error && typeof error === 'object') {
      console.error('Error stack:', error.stack)
    }
    
    // Redirect to the original URL even if tracking fails
    const targetUrl = new URL(request.url).searchParams.get('url')
    return NextResponse.redirect(targetUrl || '/')
  }
}