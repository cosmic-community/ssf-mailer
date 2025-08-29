import { NextRequest, NextResponse } from 'next/server'
import { createMarketingCampaign, getEmailTemplate } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Campaign creation request body:', JSON.stringify(body, null, 2))
    
    // Validate required fields
    if (!body.name || !body.template_id) {
      const errorMsg = 'Campaign name and template are required'
      console.error('Validation error:', errorMsg, { body })
      return NextResponse.json(
        { error: errorMsg, details: 'Missing required fields', receivedData: body },
        { status: 400 }
      )
    }

    // Get the template to validate it exists
    console.log('Fetching template with ID:', body.template_id)
    const template = await getEmailTemplate(body.template_id)
    if (!template) {
      const errorMsg = 'Template not found'
      console.error('Template not found:', body.template_id)
      return NextResponse.json(
        { error: errorMsg, details: `Template ID ${body.template_id} does not exist`, templateId: body.template_id },
        { status: 404 }
      )
    }
    console.log('Template found:', template.metadata?.name)

    // Create the campaign using template ID, not the full object
    console.log('Creating campaign with data:', {
      name: body.name,
      template_id: body.template_id,
      contact_ids: body.contact_ids || [],
      target_tags: body.target_tags || [],
      send_date: body.send_date || ''
    })
    
    const result = await createMarketingCampaign({
      name: body.name,
      template_id: body.template_id,
      contact_ids: body.contact_ids || [],
      target_tags: body.target_tags || [],
      send_date: body.send_date || ''
    })

    console.log('Campaign created successfully:', result.id)

    // Revalidate the campaigns page to ensure the new campaign appears
    revalidatePath('/campaigns')
    
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    // Log detailed error information
    console.error('Error creating campaign - Full details:')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error object:', error)
    
    // Check if it's a Cosmic API error
    if (error.response) {
      console.error('Cosmic API response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })
      
      return NextResponse.json({
        error: 'Cosmic API error',
        details: error.message,
        cosmicError: {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        }
      }, { status: error.response.status || 500 })
    }
    
    // Check if it's a network error
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('Network error:', error.code)
      return NextResponse.json({
        error: 'Network connection error',
        details: `Failed to connect to Cosmic API: ${error.message}`,
        networkError: error.code
      }, { status: 503 })
    }
    
    // Generic error handling with full error details
    return NextResponse.json({
      error: 'Failed to create campaign',
      details: error.message,
      errorType: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}