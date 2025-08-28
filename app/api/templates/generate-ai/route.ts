import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { TextStreamingResponse } from '@cosmicjs/sdk'

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json()
    
    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Prompt and type are required' },
        { status: 400 }
      )
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Send initial loading message
        controller.enqueue(
          encoder.encode('data: {"type":"status","message":"Connecting to Cosmic AI...","progress":10}\n\n')
        )
        
        // Generate AI content using Cosmic AI streaming
        setTimeout(async () => {
          try {
            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Generating email content...","progress":30}\n\n')
            )

            // Create AI prompt based on template type
            let aiPrompt = ''
            if (type === 'Newsletter') {
              aiPrompt = `Create a professional HTML email newsletter template for "${prompt}". Include:
              - A header with gradient background
              - Welcome greeting with {{first_name}} placeholder
              - Main content section with highlights and bullet points
              - Call-to-action button
              - Professional footer with unsubscribe link
              - Responsive design with modern styling
              - Use inline CSS for email compatibility`
            } else if (type === 'Welcome Email') {
              aiPrompt = `Create a welcoming HTML email template for new users joining "${prompt}". Include:
              - Warm welcome header with celebration emoji
              - Personalized greeting with {{first_name}} placeholder
              - Welcome message explaining what to expect
              - Getting started section with benefits
              - Prominent call-to-action button
              - Friendly footer with contact information
              - Modern, friendly design with inline CSS`
            } else {
              aiPrompt = `Create a professional HTML email template for "${prompt}" (${type}). Include:
              - Professional header design
              - Personalized greeting with {{first_name}} placeholder
              - Clear main content section
              - Call-to-action button
              - Footer with contact information
              - Clean, modern styling with inline CSS for email compatibility`
            }

            // Generate content with Cosmic AI streaming
            const aiStream = await cosmic.ai.generateText({
              prompt: aiPrompt,
              max_tokens: 2000,
              stream: true
            }) as TextStreamingResponse

            let generatedContent = ''
            let isComplete = false

            // Process the AI stream
            aiStream.on('text', (text: string) => {
              generatedContent += text
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Generating content...","progress":60}\n\n')
              )
            })

            aiStream.on('end', () => {
              try {
                controller.enqueue(
                  encoder.encode('data: {"type":"status","message":"Finalizing template...","progress":90}\n\n')
                )

                // Generate subject line based on type and prompt
                let generatedSubject = ''
                if (type === 'Newsletter') {
                  generatedSubject = `${prompt} - Monthly Newsletter`
                } else if (type === 'Welcome Email') {
                  generatedSubject = `Welcome to ${prompt}! 🎉`
                } else {
                  generatedSubject = `${prompt} - ${type}`
                }

                // If AI didn't generate proper HTML, provide fallback
                if (!generatedContent.includes('<!DOCTYPE html>')) {
                  generatedContent = createFallbackTemplate(prompt, type, generatedContent)
                }

                // Send the final result
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    data: {
                      subject: generatedSubject,
                      content: generatedContent
                    },
                    message: 'Template generated successfully!'
                  })}\n\n`)
                )
                
                controller.close()
                isComplete = true
              } catch (error: unknown) {
                if (!isComplete) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'error',
                      error: 'Failed to finalize template generation'
                    })}\n\n`)
                  )
                  controller.close()
                }
              }
            })

            aiStream.on('error', (error: Error) => {
              if (!isComplete) {
                console.error('Cosmic AI stream error:', error)
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'error',
                    error: 'AI generation failed, using fallback template'
                  })}\n\n`)
                )
                
                // Provide fallback template
                const fallbackContent = createFallbackTemplate(prompt, type, '')
                const fallbackSubject = type === 'Welcome Email' ? `Welcome to ${prompt}! 🎉` : `${prompt} - ${type}`
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    data: {
                      subject: fallbackSubject,
                      content: fallbackContent
                    },
                    message: 'Template created with fallback design!'
                  })}\n\n`)
                )
                
                controller.close()
              }
            })

          } catch (error) {
            console.error('Error starting AI generation:', error)
            
            // Provide fallback template
            const fallbackContent = createFallbackTemplate(prompt, type, '')
            const fallbackSubject = type === 'Welcome Email' ? `Welcome to ${prompt}! 🎉` : `${prompt} - ${type}`
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                data: {
                  subject: fallbackSubject,
                  content: fallbackContent
                },
                message: 'Template created successfully!'
              })}\n\n`)
            )
            
            controller.close()
          }
        }, 500)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error in AI template generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI template' },
      { status: 500 }
    )
  }
}

// Fallback template generator
function createFallbackTemplate(prompt: string, type: string, aiContent: string): string {
  const baseStyles = `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f8f9fa;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 30px;
      color: #666666;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 40px 0 20px 0;
    }
    p {
      font-size: 16px;
      margin: 0 0 20px 0;
      color: #555555;
    }
    .cta-button {
      display: inline-block;
      background-color: #667eea;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
      font-size: 14px;
      color: #666666;
    }
  `

  if (type === 'Newsletter') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt} Newsletter</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${prompt}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi {{first_name}},
            </div>
            
            ${aiContent || `
            <h2>What's New This Month</h2>
            
            <p>We're excited to share the latest updates and insights with you. This month has been packed with new developments and we can't wait to tell you all about them.</p>
            
            <p>Here are some highlights:</p>
            <ul>
                <li>New features and improvements</li>
                <li>Community updates and success stories</li>
                <li>Upcoming events and opportunities</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Read More</a>
            </div>
            
            <p>Thank you for being part of our community. We look forward to sharing more exciting updates with you soon!</p>
            `}
        </div>
        
        <div class="footer">
            <p>Best regards,<br>Your Team</p>
            <p>
                <a href="#">Website</a> | 
                <a href="#">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>`
  } else if (type === 'Welcome Email') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${prompt}</title>
    <style>${baseStyles}
    .greeting {
      font-size: 18px;
      margin-bottom: 30px;
      color: #1a1a1a;
      font-weight: 600;
    }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Welcome Aboard! 🎉</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hi {{first_name}},
            </div>
            
            ${aiContent || `
            <p>Welcome to ${prompt}! We're thrilled to have you join our community.</p>
            
            <p>You've just taken the first step towards an amazing journey with us. Here's what you can expect:</p>
            
            <ul>
                <li>Regular updates and valuable insights</li>
                <li>Exclusive content and special offers</li>
                <li>Access to our supportive community</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Get Started</a>
            </div>
            
            <p>If you have any questions, don't hesitate to reach out. We're here to help!</p>
            `}
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The ${prompt} Team</p>
            <p>
                <a href="#">Contact Us</a> | 
                <a href="#">Help Center</a>
            </p>
        </div>
    </div>
</body>
</html>`
  } else {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${prompt} - ${type}</title>
    <style>${baseStyles}</style>
</head>
<body>
    <div class="email-container">
        <div class="content">
            <div class="greeting">
                Hi {{first_name}},
            </div>
            
            <h1>${prompt}</h1>
            
            ${aiContent || `
            <p>We have some exciting news to share with you today!</p>
            
            <p>This update brings new features and improvements that we think you'll love. We've been working hard to make your experience even better.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Learn More</a>
            </div>
            
            <p>Thank you for your continued support. We can't wait for you to try out these new features!</p>
            `}
        </div>
        
        <div class="footer">
            <p>Best regards,<br>Your Team</p>
            <p>
                <a href="#">Website</a> | 
                <a href="#">Support</a>
            </p>
        </div>
    </div>
</body>
</html>`
  }
}