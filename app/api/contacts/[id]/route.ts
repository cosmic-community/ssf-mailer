// app/api/contacts/[id]/route.ts
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
    
    // Validate required fields - expect flat structure from EditContactModal
    if (!body.first_name || !body.email) {
      return NextResponse.json(
        { error: 'First name and email are required' },
        { status: 400 }
      )
    }

    // Prepare the update data
    const updateData: any = {
      title: `${body.first_name} ${body.last_name || ''}`.trim()
    }

    // Prepare metadata for Cosmic update - ONLY include changed fields
    const metadataUpdate: any = {}
    
    if (body.first_name) metadataUpdate.first_name = body.first_name
    if (body.last_name !== undefined) metadataUpdate.last_name = body.last_name || ''
    if (body.email) metadataUpdate.email = body.email
    if (body.list_ids !== undefined) metadataUpdate.lists = body.list_ids
    if (body.tags !== undefined) metadataUpdate.tags = body.tags
    if (body.notes !== undefined) metadataUpdate.notes = body.notes || ''
    
    // Handle status field - convert to object format for Cosmic
    if (body.status) {
      metadataUpdate.status = {
        key: body.status.toLowerCase().replace(' ', '_'),
        value: body.status
      }
    }

    updateData.metadata = metadataUpdate

    // Update the contact with only the changed fields
    const result = await cosmic.objects.updateOne(id, updateData)

    // Revalidate the contacts page after updating
    revalidatePath('/contacts')

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
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
    
    // Delete the contact from Cosmic
    await cosmic.objects.deleteOne(id)

    // Revalidate the contacts page after deleting
    revalidatePath('/contacts')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}