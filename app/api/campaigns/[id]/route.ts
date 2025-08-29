// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

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

    // Update the campaign - store template as ID reference, not object
    const result = await cosmic.objects.updateOne(id, {
      title: body.name,
      metadata: {
        name: body.name,
        template: body.template_id, // Store as ID reference
        target_contacts: body.contact_ids || [],
        target_tags: body.target_tags || [],
        send_date: body.send_date || ''
      }
    })

    // Revalidate the campaigns page to ensure updates are reflected
    revalidatePath('/campaigns')
    revalidatePath(`/campaigns/${id}`)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete the campaign from Cosmic
    await cosmic.objects.deleteOne(id)

    // Revalidate the campaigns page to reflect the deletion
    revalidatePath('/campaigns')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}