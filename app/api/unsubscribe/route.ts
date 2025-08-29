import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  if (!email || !token) {
    return new NextResponse(
      generateUnsubscribePage({
        success: false,
        message: 'Invalid unsubscribe link. Please contact support if you need assistance.',
        email: email || 'unknown'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  }

  try {
    // Find the contact by email
    const response = await cosmic.objects
      .find({ 
        type: 'email-contacts',
        'metadata.email': email
      })
      .props(['id', 'title', 'metadata'])
      .depth(1)

    if (!response.objects || response.objects.length === 0) {
      return new NextResponse(
        generateUnsubscribePage({
          success: false,
          message: 'Email address not found in our system.',
          email
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }

    const contact = response.objects[0]

    // Update contact status to unsubscribed
    await cosmic.objects.updateOne(contact.id, {
      metadata: {
        status: 'Unsubscribed'
      }
    })

    return new NextResponse(
      generateUnsubscribePage({
        success: true,
        message: 'has been successfully unsubscribed from our mailing list.',
        email
      }),
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return new NextResponse(
      generateUnsubscribePage({
        success: false,
        message: 'An error occurred while processing your unsubscribe request. Please try again later or contact support.',
        email
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  }
}

function generateUnsubscribePage({ success, message, email }: { success: boolean, message: string, email: string }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${success ? 'Successfully Unsubscribed' : 'Unsubscribe Error'}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          line-height: 1.6;
        }
        
        .container {
          background: white;
          max-width: 500px;
          width: 100%;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          text-align: center;
        }
        
        .header {
          padding: 40px 30px 30px;
          background: ${success ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
          color: white;
        }
        
        .icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .icon svg {
          width: 40px;
          height: 40px;
          stroke: white;
          stroke-width: 2;
          fill: none;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .content {
          padding: 30px;
        }
        
        .email {
          font-weight: 600;
          color: #333;
          background: #f8f9fa;
          padding: 12px 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid ${success ? '#28a745' : '#dc3545'};
        }
        
        .message {
          color: #666;
          font-size: 16px;
          margin-bottom: 30px;
        }
        
        .additional-info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
          font-size: 14px;
          color: #666;
        }
        
        .contact-link {
          color: #667eea;
          text-decoration: none;
        }
        
        .contact-link:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 480px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          
          .header {
            padding: 30px 20px 20px;
          }
          
          .icon {
            width: 60px;
            height: 60px;
          }
          
          .icon svg {
            width: 30px;
            height: 30px;
          }
          
          h1 {
            font-size: 24px;
          }
          
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">
            ${success ? `
              <svg viewBox="0 0 24 24">
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            `}
          </div>
          <h1>${success ? 'Successfully Unsubscribed' : 'Unsubscribe Error'}</h1>
        </div>
        
        <div class="content">
          ${success ? `
            <p class="message">The email address</p>
            <div class="email">${email}</div>
            <p class="message">${message}</p>
            <p class="message">You will no longer receive marketing emails from us.</p>
            
            <div class="additional-info">
              <p><strong>What happens next?</strong></p>
              <p>• You'll stop receiving promotional emails immediately</p>
              <p>• You may still receive transactional emails (receipts, account updates)</p>
              <p>• If you unsubscribed by mistake, please <a href="mailto:support@yourcompany.com" class="contact-link">contact our support team</a></p>
            </div>
          ` : `
            <div class="email">${email}</div>
            <p class="message">${message}</p>
            
            <div class="additional-info">
              <p><strong>Need help?</strong></p>
              <p>If you're having trouble unsubscribing, please <a href="mailto:support@yourcompany.com" class="contact-link">contact our support team</a> and we'll help you right away.</p>
            </div>
          `}
        </div>
      </div>
    </body>
    </html>
  `
}