import { NextRequest, NextResponse } from 'next/server'
import { updateEmailList, deleteEmailList, getEmailList } from '@/lib/cosmic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const list = await getEmailList(id)
    
    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: list
    })
  } catch (error) {
    console.error('List fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch list' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Validate required fields for updates
    if (data.name && !data.name.trim()) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      )
    }

    const updatedList = await updateEmailList(id, data)

    return NextResponse.json({
      success: true,
      message: 'List updated successfully',
      data: updatedList
    })
  } catch (error) {
    console.error('List update error:', error)
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Check if list exists
    const list = await getEmailList(id)
    if (!list) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      )
    }

    await deleteEmailList(id)

    return NextResponse.json({
      success: true,
      message: 'List deleted successfully'
    })
  } catch (error) {
    console.error('List deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    )
  }
}