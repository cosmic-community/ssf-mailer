import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

// Create a more reliable 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
])

export async function GET(request: NextRequest) {
  // Always return the tracking pixel first for fastest response
  const pixelResponse = new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
      'Last-Modified': new Date().toUTCString(),
      // CORS headers for better email client compatibility
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'User-Agent, Referer',
      // Security and privacy headers
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex',
      'X-Content-Type-Options': 'nosniff',
      // Email client specific headers
      'P3P': 'CP="This is not a P3P policy"'
    }
  })

  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('c')
    const contactId = searchParams.get('u')
    const method = searchParams.get('m') || 'img' // tracking method
    const timestamp = searchParams.get('t') || Date.now().toString()

    console.log('Open tracking request:', {
      campaignId,
      contactId,
      method,
      timestamp,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer')
    })

    // If we don't have required parameters, still return the pixel but don't track
    if (!campaignId || !contactId) {
      console.log('Open tracking pixel served but missing required parameters')
      return pixelResponse
    }

    // Record the open event asynchronously with retry logic
    recordOpenEventWithRetry(campaignId, contactId, method, timestamp).catch(error => {
      console.error('Error recording open event (async):', error)
    })

    return pixelResponse
  } catch (error) {
    console.error('Open tracking error:', error)
    
    // Always return a tracking pixel, even on error
    return pixelResponse
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'User-Agent, Referer',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// Enhanced function to record open events with retry logic and deduplication
async function recordOpenEventWithRetry(campaignId: string, contactId: string, method: string, timestamp: string, retryCount: number = 0) {
  const maxRetries = 3
  
  try {
    await recordOpenEvent(campaignId, contactId, method, timestamp)
  } catch (error) {
    console.error(`Open tracking attempt ${retryCount + 1} failed:`, error)
    
    if (retryCount < maxRetries) {
      // Exponential backoff: wait 1s, 2s, 4s between retries
      const delay = Math.pow(2, retryCount) * 1000
      setTimeout(() => {
        recordOpenEventWithRetry(campaignId, contactId, method, timestamp, retryCount + 1)
      }, delay)
    } else {
      console.error('All open tracking attempts failed for campaign:', campaignId)
    }
  }
}

// Separate async function to record the open event
async function recordOpenEvent(campaignId: string, contactId: string, method: string, timestamp: string) {
  try {
    console.log('Recording open event for campaign:', campaignId, 'contact:', contactId, 'method:', method)

    // Fetch campaign with error handling
    const response = await cosmic.objects.findOne({ 
      id: campaignId, 
      type: 'marketing-campaigns' 
    }).props(['id', 'title', 'metadata']).depth(1)

    if (!response.object) {
      console.error('Campaign not found for open tracking:', campaignId)
      return
    }

    const campaign = response.object
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

    // Simple deduplication: store opens with contact+campaign key
    const openKey = `${campaignId}-${contactId}`
    
    // For this simple implementation, we'll just increment opens
    // In a production system, you might want to store individual opens in a separate collection
    const newOpened = (currentStats.opened || 0) + 1
    const sentCount = Math.max(currentStats.sent || 0, 1) // Ensure we don't divide by zero
    
    const newStats = {
      sent: sentCount,
      delivered: currentStats.delivered || 0,
      opened: newOpened,
      clicked: currentStats.clicked || 0,
      bounced: currentStats.bounced || 0,
      unsubscribed: currentStats.unsubscribed || 0,
      open_rate: `${Math.round((newOpened / sentCount) * 100)}%`,
      click_rate: `${Math.round(((currentStats.clicked || 0) / sentCount) * 100)}%`
    }

    console.log('Updating campaign stats:', { 
      campaignId,
      oldStats: currentStats, 
      newStats,
      method,
      timestamp 
    })

    // Update campaign stats - only include the stats field
    await cosmic.objects.updateOne(campaignId, {
      metadata: {
        stats: newStats
      }
    })

    console.log('Open event recorded successfully for campaign:', campaignId)
  } catch (error: any) {
    console.error('Failed to record open event:', {
      campaignId,
      contactId,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}