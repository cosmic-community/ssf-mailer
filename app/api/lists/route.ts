import { NextRequest, NextResponse } from 'next/server'
import { createEmailList, getEmailLists } from '@/lib/cosmic'
import { CreateListData } from '@/types'

export async function GET() {
  try {
    const lists = await getEmailLists()
    
    return NextResponse.json({
      success: true,
      data: lists
    })
  } catch (error) {
    console.error('Lists fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateListData = await request.json()
    
    console.log('Creating list with data:', data)
    
    // Validate required fields
    if (!data.name || !data.name.trim()) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      )
    }
    
    if (!data.list_type) {
      return NextResponse.json(
        { error: 'List type is required' },
        { status: 400 }
      )
    }
    
    console.log('Validation passed, creating list...')
    
    // Create the list
    const list = await createEmailList(data)
    
    console.log('List created successfully:', list.id)
    
    return NextResponse.json({
      success: true,
      message: 'List created successfully',
      data: list
    })
  } catch (error: any) {
    console.error('List creation error:', error)
    
    return NextResponse.json({
      error: 'Failed to create list',
      details: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}