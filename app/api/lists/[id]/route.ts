// app/api/lists/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmailList, updateEmailList, deleteEmailList } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const list = await getEmailList(id)
    
    if (!list) {
      return NextResponse.json(
        { error: 'Email list not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: list })
  } catch (error) {
    console.error('Error fetching email list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email list' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate required fields
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { error: 'List name cannot be empty' },
        { status: 400 }
      )
    }

    // Update the list
    const result = await updateEmailList(id, {
      name: body.name,
      description: body.description,
      list_type: body.list_type,
      active: body.active
    })

    // Revalidate relevant pages
    revalidatePath('/contacts')
    revalidatePath('/campaigns')

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error updating email list:', error)
    return NextResponse.json(
      { error: 'Failed to update email list' },
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
    
    // Delete the list
    await deleteEmailList(id)

    // Revalidate relevant pages
    revalidatePath('/contacts')
    revalidatePath('/campaigns')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting email list:', error)
    return NextResponse.json(
      { error: 'Failed to delete email list' },
      { status: 500 }
    )
  }
}