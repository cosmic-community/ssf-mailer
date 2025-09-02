import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const campaignId = searchParams.get('c')
  const contactId = searchParams.get('u')
  const linkUrl = searchParams.get('url')
  
  try {
    // Track the click if campaign and contact IDs are provided
    if (campaignId && contactId) {
      try {
        // Get the campaign to update click stats
        const { object: campaign } = await cosmic.objects
          .findOne({ type: 'marketing-campaigns', id: campaignId })
          .props(['id', 'metadata'])
          .depth(1)

        if (campaign && campaign.metadata?.stats) {
          const currentStats = campaign.metadata.stats
          const newClickCount = (currentStats.clicked || 0) + 1
          const sentCount = currentStats.sent || 0
          
          // Update click stats
          await cosmic.objects.updateOne(campaignId, {
            metadata: {
              stats: {
                ...currentStats,
                clicked: newClickCount,
                click_rate: sentCount > 0 ? `${Math.round((newClickCount / sentCount) * 100)}%` : '0%'
              }
            }
          })
        }
        
        console.log(`Click tracked: Campaign ${campaignId}, Contact ${contactId}`)
      } catch (trackingError) {
        // Log tracking errors but don't prevent redirect
        console.error('Error tracking click:', trackingError)
      }
    }
    
    // Redirect to the target URL if provided
    if (linkUrl) {
      try {
        const decodedUrl = decodeURIComponent(linkUrl)
        
        // Validate URL format
        const url = new URL(decodedUrl)
        
        // Allow http and https protocols
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return NextResponse.redirect(decodedUrl)
        } else {
          throw new Error('Invalid URL protocol')
        }
      } catch (urlError) {
        console.error('Error processing redirect URL:', urlError)
        // Return a fallback response for invalid URLs
        return new NextResponse('Invalid redirect URL', { status: 400 })
      }
    }
    
    // If no URL provided, return a simple response
    return new NextResponse('Click tracked', { status: 200 })
    
  } catch (error) {
    // Fix TS2339: Add proper error type checking
    console.error('Error in click tracking:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    
    // Try to redirect to the URL even if tracking fails
    if (linkUrl) {
      try {
        const decodedUrl = decodeURIComponent(linkUrl)
        const url = new URL(decodedUrl)
        
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          return NextResponse.redirect(decodedUrl)
        }
      } catch (redirectError) {
        console.error('Error in fallback redirect:', redirectError)
      }
    }
    
    return new NextResponse('Error processing request', { status: 500 })
  }
}