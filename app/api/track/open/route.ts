import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

// Create a more reliable 1x1 transparent GIF
const TRACKING_PIXEL = Buffer.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
  0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
])

// In-memory cache for deduplication (in production, use Redis or database)
const openCache = new Map<string, number>()
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('c')
  const contactId = searchParams.get('u')
  const method = searchParams.get('m') || 'img'
  const timestamp = searchParams.get('t') || Date.now().toString()

  console.log('Open tracking request received:', {
    campaignId,
    contactId,
    method,
    timestamp,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  })

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
      'P3P': 'CP="This is not a P3P policy"',
      // Additional headers for email client compatibility
      'Content-Disposition': 'inline',
      'X-Content-Duration': '0'
    }
  })

  // If we don't have required parameters, still return the pixel but don't track
  if (!campaignId || !contactId) {
    console.log('Open tracking pixel served but missing required parameters:', { campaignId, contactId })
    return pixelResponse
  }

  // Record the open event asynchronously with enhanced error handling
  // Don't wait for this to complete - return pixel immediately
  recordOpenEventSafely(campaignId, contactId, method, timestamp, request).catch(error => {
    console.error('Critical error in open tracking (async):', {
      campaignId,
      contactId,
      method,
      error: error.message,
      stack: error.stack
    })
  })

  return pixelResponse
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'User-Agent, Referer, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Content-Length': '0'
    }
  })
}

// Enhanced function to safely record open events with deduplication and retry logic
async function recordOpenEventSafely(
  campaignId: string, 
  contactId: string, 
  method: string, 
  timestamp: string,
  request: NextRequest,
  retryCount: number = 0
) {
  const maxRetries = 2 // Reduced retries to prevent excessive load
  
  try {
    // Check for duplicate opens (deduplication)
    const openKey = `${campaignId}-${contactId}`
    const now = Date.now()
    const lastOpen = openCache.get(openKey)
    
    // If we've seen this open within the cache duration, skip it
    if (lastOpen && (now - lastOpen) < CACHE_DURATION) {
      console.log('Duplicate open detected and skipped:', { campaignId, contactId, method })
      return
    }
    
    // Clean up old cache entries periodically (simple cleanup)
    if (openCache.size > 1000) {
      const cutoff = now - CACHE_DURATION
      for (const [key, time] of openCache.entries()) {
        if (time < cutoff) {
          openCache.delete(key)
        }
      }
    }
    
    // Record this open in cache
    openCache.set(openKey, now)
    
    // Record the open event
    await recordOpenEvent(campaignId, contactId, method, timestamp, request)
    
    console.log('Open event recorded successfully:', { campaignId, contactId, method })
  } catch (error: any) {
    console.error(`Open tracking attempt ${retryCount + 1} failed:`, {
      campaignId,
      contactId,
      method,
      error: error.message,
      stack: error.stack
    })
    
    if (retryCount < maxRetries) {
      // Exponential backoff: wait 1s, 2s between retries
      const delay = Math.pow(2, retryCount) * 1000
      console.log(`Retrying open tracking in ${delay}ms...`)
      
      setTimeout(() => {
        recordOpenEventSafely(campaignId, contactId, method, timestamp, request, retryCount + 1)
          .catch(retryError => {
            console.error('Retry also failed:', retryError)
          })
      }, delay)
    } else {
      console.error('All open tracking attempts failed:', { campaignId, contactId, finalError: error.message })
    }
  }
}

// Core function to record the open event with enhanced error handling
async function recordOpenEvent(
  campaignId: string, 
  contactId: string, 
  method: string, 
  timestamp: string,
  request: NextRequest
) {
  console.log('Starting open event recording:', { campaignId, contactId, method, timestamp })

  try {
    // Fetch campaign with better error handling
    const response = await cosmic.objects.findOne({ 
      id: campaignId, 
      type: 'marketing-campaigns' 
    }).props(['id', 'title', 'metadata']).depth(1)

    if (!response.object) {
      throw new Error(`Campaign not found: ${campaignId}`)
    }

    const campaign = response.object
    
    // Ensure we have valid metadata structure
    if (!campaign.metadata) {
      console.error('Campaign metadata is missing:', campaignId)
      return
    }

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

    // Calculate new stats with proper validation
    const newOpened = Math.max((currentStats.opened || 0) + 1, 1)
    const sentCount = Math.max(currentStats.sent || 0, 1) // Ensure we don't divide by zero
    const clickedCount = currentStats.clicked || 0
    
    const newStats = {
      sent: sentCount,
      delivered: Math.max(currentStats.delivered || 0, newOpened), // Ensure delivered >= opened
      opened: newOpened,
      clicked: clickedCount,
      bounced: currentStats.bounced || 0,
      unsubscribed: currentStats.unsubscribed || 0,
      open_rate: `${Math.round((newOpened / sentCount) * 100)}%`,
      click_rate: `${Math.round((clickedCount / sentCount) * 100)}%`
    }

    console.log('Updating campaign stats:', { 
      campaignId,
      oldStats: currentStats, 
      newStats,
      method,
      timestamp,
      userAgent: request.headers.get('user-agent')?.substring(0, 100) // Limit length for logging
    })

    // Update campaign stats with minimal payload (only stats field)
    const updateResult = await cosmic.objects.updateOne(campaignId, {
      metadata: {
        stats: newStats
      }
    })

    if (!updateResult.object) {
      throw new Error('Failed to update campaign - no object returned')
    }

    console.log('Open event recorded and stats updated successfully:', { 
      campaignId, 
      contactId,
      newOpened: newStats.opened,
      newOpenRate: newStats.open_rate
    })

  } catch (error: any) {
    // Enhanced error logging
    console.error('Failed to record open event:', {
      campaignId,
      contactId,
      method,
      timestamp,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code || 'unknown'
    })
    
    // Re-throw to trigger retry logic
    throw new Error(`Open tracking failed: ${error.message}`)
  }
}