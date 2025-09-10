import { NextRequest, NextResponse } from 'next/server'
import { bulkUpdateContactLists } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.contact_ids || !Array.isArray(body.contact_ids) || body.contact_ids.length === 0) {
      return NextResponse.json(
        { error: 'Contact IDs array is required' },
        { status: 400 }
      )
    }

    if (!body.list_ids_to_add && !body.list_ids_to_remove) {
      return NextResponse.json(
        { error: 'At least one of list_ids_to_add or list_ids_to_remove is required' },
        { status: 400 }
      )
    }

    // Ensure arrays are provided (empty arrays are valid)
    const list_ids_to_add = body.list_ids_to_add || []
    const list_ids_to_remove = body.list_ids_to_remove || []

    // Update contacts
    const result = await bulkUpdateContactLists({
      contact_ids: body.contact_ids,
      list_ids_to_add,
      list_ids_to_remove
    })

    // Revalidate relevant pages
    revalidatePath('/contacts')
    revalidatePath('/campaigns')

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: `Updated ${result.updated} contacts${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
    })
  } catch (error) {
    console.error('Error bulk updating contact lists:', error)
    return NextResponse.json(
      { error: 'Failed to update contact lists' },
      { status: 500 }
    )
  }
}