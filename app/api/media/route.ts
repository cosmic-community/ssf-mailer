import { NextRequest, NextResponse } from 'next/server'
import { getMedia, uploadMedia, getMediaFolders } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const folder = searchParams.get('folder') || undefined
    const sort = searchParams.get('sort') || '-created_at'
    const action = searchParams.get('action')

    // Handle different actions
    if (action === 'folders') {
      const folders = await getMediaFolders()
      return NextResponse.json({
        success: true,
        folders
      })
    }

    // Default: get media list
    const result = await getMedia({
      limit,
      skip,
      folder,
      sort
    })
    
    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Media fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || undefined
    const alt_text = formData.get('alt_text') as string || undefined
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 900MB as per Cosmic limits)
    const maxSize = 900 * 1024 * 1024 // 900MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 900MB limit' },
        { status: 400 }
      )
    }

    // Validate file type (basic validation)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported' },
        { status: 400 }
      )
    }

    const mediaItem = await uploadMedia(file, {
      folder,
      alt_text,
      metadata: {
        uploaded_via: 'media_library',
        upload_timestamp: new Date().toISOString()
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      media: mediaItem
    })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: 500 }
    )
  }
}