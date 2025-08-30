// app/api/contacts/[id]/route.ts
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
    if (!body.metadata.first_name || !body.metadata.email) {
      return NextResponse.json(
        { error: 'First name and email are required' },
        { status: 400 }
      )
    }

    // Prepare metadata for Cosmic update
    const metadataUpdate: any = {}
    
    if (body.metadata.first_name) metadataUpdate.first_name = body.metadata.first_name
    if (body.metadata.last_name !== undefined) metadataUpdate.last_name = body.metadata.last_name
    if (body.metadata.email) metadataUpdate.email = body.metadata.email
    if (body.metadata.tags !== undefined) metadataUpdate.tags = body.metadata.tags
    if (body.metadata.subscribe_date) metadataUpdate.subscribe_date = body.metadata.subscribe_date
    if (body.metadata.notes !== undefined) metadataUpdate.notes = body.metadata.notes
    
    // Handle status field - convert from object format to string value for Cosmic
    if (body.metadata.status) {
      if (typeof body.metadata.status === 'object' && body.metadata.status.value) {
        // If status is sent as object with key/value, use the value
        metadataUpdate.status = body.metadata.status.value
      } else if (typeof body.metadata.status === 'string') {
        // If status is sent as string, use it directly
        metadataUpdate.status = body.metadata.status
      }
    }

    // Update the contact with only the changed fields
    const result = await cosmic.objects.updateOne(id, {
      title: body.title,
      metadata: metadataUpdate
    })

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}