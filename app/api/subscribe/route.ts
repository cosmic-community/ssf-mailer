import { NextRequest, NextResponse } from 'next/server'
import { createEmailContact } from '@/lib/cosmic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Create the contact with public subscription data
    const result = await createEmailContact({
      first_name: body.first_name || 'Subscriber',
      last_name: body.last_name || '',
      email: body.email,
      status: 'Active',
      tags: ['Public Signup', ...(body.tags || [])],
      subscribe_date: new Date().toISOString().split('T')[0],
      notes: body.source ? `Subscribed via: ${body.source}` : 'Public subscription'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully subscribed to our email list!',
      data: result 
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    
    // Check if it's a duplicate email error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message
      if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        return NextResponse.json(
          { error: 'This email is already subscribed to our list' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process subscription. Please try again.' },
      { status: 500 }
    )
  }
}