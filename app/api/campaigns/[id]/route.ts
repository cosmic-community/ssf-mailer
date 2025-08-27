// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.template_id) {
      return NextResponse.json(
        { error: 'Campaign name and template are required' },
        { status: 400 }
      )
    }

    // Update the campaign - only include changed fields
    const result = await cosmic.objects.updateOne(id, {
      title: body.name,
      metadata: {
        name: body.name,
        template: body.template_id,
        target_contacts: body.contact_ids || [],
        target_tags: body.target_tags || [],
        send_date: body.send_date || ''
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}