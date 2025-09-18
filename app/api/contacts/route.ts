import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact, getEmailContacts } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '25')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const listId = searchParams.get('list_id') || undefined

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      )
    }

    // Fetch contacts using existing function
    const { contacts, total } = await getEmailContacts({
      limit,
      skip,
      search: search || undefined,
      status: status && status !== 'all' ? status : undefined,
      list_id: listId && listId !== 'all' ? listId : undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        contacts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.first_name || !body.email) {
      return NextResponse.json(
        { error: 'First name and email are required' },
        { status: 400 }
      )
    }

    // Create the contact
    const result = await createEmailContact({
      first_name: body.first_name,
      last_name: body.last_name || '',
      email: body.email,
      status: body.status || 'Active',
      list_ids: body.list_ids || [], // Include list_ids
      tags: body.tags || [],
      subscribe_date: body.subscribe_date || new Date().toISOString().split('T')[0],
      notes: body.notes || ''
    })

    // Revalidate the contacts page after creating a contact
    revalidatePath('/contacts')

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}