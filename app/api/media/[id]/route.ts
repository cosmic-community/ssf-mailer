// app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSingleMedia, updateMedia, deleteMedia } from '@/lib/cosmic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const media = await getSingleMedia(id)
    
    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      media
    })
  } catch (error) {
    console.error('Media fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const updateData: {
      folder?: string;
      alt_text?: string;
      metadata?: Record<string, any>;
    } = {}
    
    if (data.folder !== undefined) updateData.folder = data.folder
    if (data.alt_text !== undefined) updateData.alt_text = data.alt_text
    if (data.metadata !== undefined) updateData.metadata = data.metadata
    
    const media = await updateMedia(id, updateData)
    
    return NextResponse.json({
      success: true,
      message: 'Media updated successfully',
      media
    })
  } catch (error) {
    console.error('Media update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update media' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    await deleteMedia(id)
    
    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully'
    })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete media' },
      { status: 500 }
    )
  }
}