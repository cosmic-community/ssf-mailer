import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  if (!email || !token) {
    return NextResponse.json(
      { error: 'Email and token are required' },
      { status: 400 }
    )
  }

  try {
    // Find the contact by email
    const response = await cosmic.objects.find({
      type: 'email-contacts',
      'metadata.email': email
    }).depth(1)

    if (!response.objects || response.objects.length === 0) {
      return NextResponse.json(
        { error: 'Email address not found' },
        { status: 404 }
      )
    }

    const contact = response.objects[0]

    // Simple token validation - in production, use a more secure token system
    const expectedToken = Buffer.from(email + process.env.COSMIC_BUCKET_SLUG).toString('base64')
    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 400 }
      )
    }

    // Update contact status to unsubscribed
    await cosmic.objects.updateOne(contact.id, {
      metadata: {
        status: 'Unsubscribed'
      }
    })

    // Return HTML response for user-friendly unsubscribe confirmation
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              text-align: center;
              line-height: 1.6;
            }
            .container {
              background: #f9fafb;
              border-radius: 8px;
              padding: 40px;
              border: 1px solid #e5e7eb;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 20px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 32px;
            }
            h1 {
              color: #111827;
              margin-bottom: 16px;
            }
            p {
              color: #6b7280;
              margin-bottom: 16px;
            }
            .email {
              font-weight: 600;
              color: #374151;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>Successfully Unsubscribed</h1>
            <p>The email address <span class="email">${email}</span> has been successfully unsubscribed from our mailing list.</p>
            <p>You will no longer receive marketing emails from us.</p>
            <p>If you unsubscribed by mistake, please contact our support team.</p>
          </div>
        </body>
      </html>
    `

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find the contact by email
    const response = await cosmic.objects.find({
      type: 'email-contacts',
      'metadata.email': email
    }).depth(1)

    if (!response.objects || response.objects.length === 0) {
      return NextResponse.json(
        { error: 'Email address not found' },
        { status: 404 }
      )
    }

    const contact = response.objects[0]

    // Update contact status to unsubscribed
    await cosmic.objects.updateOne(contact.id, {
      metadata: {
        status: 'Unsubscribed'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed'
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    )
  }
}