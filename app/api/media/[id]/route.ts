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
    
    // Server-side media retrieval
    const media = await getSingleMedia(id)
    
    if (!media) {
      return NextResponse.json(
        { error: 'Media not found', success: false },
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
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch media',
        success: false 
      },
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
    
    // Server-side input validation
    const updateData: {
      folder?: string;
      alt_text?: string;
      metadata?: Record<string, any>;
    } = {}
    
    // Validate and sanitize folder name
    if (data.folder !== undefined) {
      const folder = typeof data.folder === 'string' ? data.folder.trim() : ''
      updateData.folder = folder || undefined
    }
    
    // Validate and sanitize alt text
    if (data.alt_text !== undefined) {
      const altText = typeof data.alt_text === 'string' ? data.alt_text.trim() : ''
      updateData.alt_text = altText || undefined
    }
    
    // Handle additional metadata
    if (data.metadata !== undefined && typeof data.metadata === 'object') {
      updateData.metadata = {
        ...data.metadata,
        last_modified: new Date().toISOString(),
        modified_via: 'media_library_api'
      }
    }
    
    // Update via server-side function
    const media = await updateMedia(id, updateData)
    
    return NextResponse.json({
      success: true,
      message: 'Media updated successfully',
      media
    })
  } catch (error) {
    console.error('Media update error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update media',
        success: false 
      },
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
    
    // Verify media exists before deletion
    const media = await getSingleMedia(id)
    if (!media) {
      return NextResponse.json(
        { error: 'Media not found', success: false },
        { status: 404 }
      )
    }
    
    // Server-side deletion
    await deleteMedia(id)
    
    return NextResponse.json({
      success: true,
      message: 'Media deleted successfully'
    })
  } catch (error) {
    console.error('Media delete error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete media',
        success: false 
      },
      { status: 500 }
    )
  }
}