import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

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
      tags: body.tags || [],
      subscribe_date: body.subscribe_date || new Date().toISOString().split('T')[0],
      notes: body.notes || ''
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}