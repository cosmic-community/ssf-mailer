import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    // Get the access code from environment variables
    const validCode = process.env.ACCESS_CODE
    
    if (!validCode) {
      return NextResponse.json(
        { error: 'Access code not configured' },
        { status: 500 }
      )
    }
    
    // Check if the provided code matches the environment variable
    if (code !== validCode) {
      return NextResponse.json(
        { error: 'Invalid access code' },
        { status: 401 }
      )
    }
    
    // Set authentication cookie
    const response = NextResponse.json({ success: true })
    
    // Set cookie that expires in 24 hours
    response.cookies.set('email-marketing-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    
    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}