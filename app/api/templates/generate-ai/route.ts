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

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Processing with Cosmic AI...","progress":50}\n\n')
            )

            // Generate content with Cosmic AI streaming
            const aiResponse = await cosmic.ai.generateText({
              prompt: aiPrompt,
              max_tokens: 2000,
              stream: true
            })

            // Check if aiResponse is a streaming response by checking for the 'on' method
            const isStreamingResponse = aiResponse && 
              typeof aiResponse === 'object' && 
              'on' in aiResponse && 
              typeof aiResponse.on === 'function';

            if (!isStreamingResponse) {
              throw new Error('AI stream not available or invalid')
            }

            // Now we can safely use the streaming response
            const aiStream = aiResponse as TextStreamingResponse;
            
            let generatedContent = ''
            let isComplete = false

            // Process the AI stream using event listeners
            aiStream.on('text', (text: string) => {
              generatedContent += text
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Generating content...","progress":60}\n\n')
              )
            })

            aiStream.on('usage', () => {
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Finalizing template...","progress":80}\n\n')
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
                  const errorMessage = error instanceof Error ? error.message : 'Failed to finalize template generation'
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'error',
                      error: errorMessage
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
                    error: 'AI generation failed. Please try again.'
                  })}\n\n`)
                )
                controller.close()
              }
            })

          } catch (error) {
            console.error('Error starting AI generation:', error)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Failed to generate template'
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