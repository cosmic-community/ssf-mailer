import { NextRequest, NextResponse } from 'next/server'
import { bulkUpdateContactLists } from '@/lib/cosmic'
import { BulkListUpdateData } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const data: BulkListUpdateData = await request.json()
    
    console.log('Bulk updating contact lists with data:', data)
    
    // Validate required fields
    if (!data.contact_ids || data.contact_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one contact must be selected' },
        { status: 400 }
      )
    }
    
    if (!data.list_ids_to_add && !data.list_ids_to_remove) {
      return NextResponse.json(
        { error: 'At least one list operation must be specified' },
        { status: 400 }
      )
    }
    
    console.log('Validation passed, updating contacts...')
    
    // Perform bulk update
    const result = await bulkUpdateContactLists(data)
    
    console.log('Bulk update completed:', result)
    
    return NextResponse.json({
      success: true,
      message: `Updated ${result.updated} contacts successfully`,
      data: result
    })
  } catch (error: any) {
    console.error('Bulk list update error:', error)
    
    return NextResponse.json({
      error: 'Failed to update contact lists',
      details: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}