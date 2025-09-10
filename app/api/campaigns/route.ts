import { NextRequest, NextResponse } from 'next/server'
import { createMarketingCampaign, getMarketingCampaigns } from '@/lib/cosmic'
import { CreateCampaignData } from '@/types'

export async function GET() {
  try {
    const campaigns = await getMarketingCampaigns()
    
    return NextResponse.json({
      success: true,
      data: campaigns
    })
  } catch (error) {
    console.error('Campaigns fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateCampaignData = await request.json()
    
    console.log('Creating campaign with data:', data)
    
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      )
    }
    
    if (!data.template_id) {
      return NextResponse.json(
        { error: 'Email template is required' },
        { status: 400 }
      )
    }
    
    // Validate that at least one target is selected
    const hasLists = data.list_ids && data.list_ids.length > 0
    const hasContacts = data.contact_ids && data.contact_ids.length > 0
    const hasTags = data.target_tags && data.target_tags.length > 0
    
    if (!hasLists && !hasContacts && !hasTags) {
      return NextResponse.json(
        { error: 'Please select at least one list, contact, or tag for this campaign' },
        { status: 400 }
      )
    }
    
    console.log('Validation passed, creating campaign...')
    
    // Create the campaign with proper error handling
    const campaign = await createMarketingCampaign(data)
    
    console.log('Campaign created successfully:', campaign.id)
    
    return NextResponse.json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    })
  } catch (error: any) {
    console.error('Campaign creation error:', error)
    
    // Provide more detailed error information
    let errorResponse: any = {
      error: 'Failed to create campaign',
      details: error.message || 'Unknown error occurred'
    }
    
    // Check for specific error types
    if (error.message?.includes('Template not found')) {
      errorResponse.error = 'Selected email template is not available'
      errorResponse.details = 'Please select a different template or create a new one'
    } else if (error.message?.includes('No contacts found')) {
      errorResponse.error = 'No active contacts found'
      errorResponse.details = 'Please select different contacts or add new contacts first'
    } else if (error.status) {
      errorResponse.cosmicError = {
        status: error.status,
        statusText: error.statusText || 'Cosmic API Error'
      }
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}