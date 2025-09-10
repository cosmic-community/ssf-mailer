import { NextRequest, NextResponse } from 'next/server'
import { bulkUpdateContactLists } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.contact_ids || !Array.isArray(body.contact_ids) || body.contact_ids.length === 0) {
      return NextResponse.json(
        { error: 'Contact IDs are required' },
        { status: 400 }
      )
    }

    if (!body.list_ids_to_add && !body.list_ids_to_remove) {
      return NextResponse.json(
        { error: 'At least one list operation is required' },
        { status: 400 }
      )
    }

    // Perform bulk update
    const result = await bulkUpdateContactLists({
      contact_ids: body.contact_ids,
      list_ids_to_add: body.list_ids_to_add || [],
      list_ids_to_remove: body.list_ids_to_remove || []
    })

    // Revalidate the contacts page
    revalidatePath('/contacts')

    return NextResponse.json({ 
      success: true, 
      data: {
        updated: result.updated,
        errors: result.errors
      }
    })
  } catch (error) {
    console.error('Error updating contact lists:', error)
    return NextResponse.json(
      { error: 'Failed to update contact lists' },
      { status: 500 }
    )
  }
}