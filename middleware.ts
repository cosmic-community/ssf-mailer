import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Skip middleware for static assets and API routes that don't need auth
  const pathname = request.nextUrl.pathname
  
  // Allow access to login page, static assets, and console capture script
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/dashboard-console-capture.js' ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const authCookie = request.cookies.get('email-marketing-auth')
  
  if (!authCookie || authCookie.value !== 'authenticated') {
    // Redirect to login page
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}