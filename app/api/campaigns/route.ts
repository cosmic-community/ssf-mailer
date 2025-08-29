import { NextRequest, NextResponse } from 'next/server'
import { createMarketingCampaign, getEmailTemplate } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.template_id) {
      return NextResponse.json(
        { error: 'Campaign name and template are required' },
        { status: 400 }
      )
    }

    // Get the template to include in campaign metadata
    const template = await getEmailTemplate(body.template_id)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create the campaign
    const result = await createMarketingCampaign({
      name: body.name,
      template_id: body.template_id,
      contact_ids: body.contact_ids || [],
      target_tags: body.target_tags || [],
      send_date: body.send_date || ''
    })

    // Revalidate the campaigns page to ensure the new campaign appears
    revalidatePath('/campaigns')
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}