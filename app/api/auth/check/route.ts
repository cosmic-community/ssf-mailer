import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated by checking the cookie
    const authCookie = request.cookies.get('email-marketing-auth')
    
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ authenticated: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}