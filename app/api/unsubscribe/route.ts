import { NextRequest, NextResponse } from 'next/server'
import { unsubscribeContact } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Unsubscribe Request</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Invalid Unsubscribe Request</h1>
              <p>The unsubscribe link is missing required information. Please contact support if you continue to receive unwanted emails.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }

    // Attempt to unsubscribe the contact
    const success = await unsubscribeContact(decodeURIComponent(email))

    if (success) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Successfully Unsubscribed</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { color: #059669; background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; }
              .info { background: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>Successfully Unsubscribed</h1>
              <p>You have been successfully unsubscribed from our email list.</p>
              <p><strong>Email:</strong> ${decodeURIComponent(email)}</p>
            </div>
            <div class="info">
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>You will no longer receive marketing emails from us</li>
                <li>It may take up to 24 hours for the change to take effect</li>
                <li>You may still receive transactional emails related to your account</li>
              </ul>
              <p>If you continue to receive unwanted emails after 24 hours, please contact our support team.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    } else {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Unsubscribe Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .warning { color: #d97706; background: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #fed7aa; }
            </style>
          </head>
          <body>
            <div class="warning">
              <h1>Email Not Found</h1>
              <p>We couldn't find this email address in our system, or it may already be unsubscribed.</p>
              <p><strong>Email:</strong> ${decodeURIComponent(email)}</p>
              <p>If you continue to receive unwanted emails, please contact our support team directly.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        }
      )
    }
  } catch (error) {
    console.error('Unsubscribe error:', error)
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe Error</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Unsubscribe Error</h1>
            <p>An error occurred while processing your unsubscribe request. Please try again later or contact our support team.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests for unsubscribe (same logic as GET)
  return GET(request)
}