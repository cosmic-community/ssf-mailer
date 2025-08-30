import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Path is required and must be a string' },
        { status: 400 }
      )
    }

    // Revalidate the specified path
    revalidatePath(path)
    
    // Also revalidate the root path to ensure any cached data is updated
    if (path !== '/') {
      revalidatePath('/')
    }

    return NextResponse.json({ 
      success: true, 
      message: `Path ${path} revalidated successfully` 
    })

  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate path' },
      { status: 500 }
    )
  }
}