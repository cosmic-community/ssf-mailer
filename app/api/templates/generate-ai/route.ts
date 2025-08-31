import { NextRequest, NextResponse } from 'next/server'
import { cosmic, getSettings } from '@/lib/cosmic'
import { TextStreamingResponse } from '@cosmicjs/sdk'

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, context_items } = await request.json()
    
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
            // Show context analysis status if context_items are provided
            if (context_items && context_items.length > 0) {
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Analyzing provided context with AI...","progress":20}\n\n')
              )
            }

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Generating email content...","progress":30}\n\n')
            )

            // Get settings for brand guidelines and company info
            const settings = await getSettings()
            const brandGuidelines = settings?.metadata.brand_guidelines || ''
            const companyName = settings?.metadata.company_name || 'Your Company'
            const aiTone = settings?.metadata.ai_tone?.value || 'Professional'
            const primaryColor = settings?.metadata.primary_brand_color || '#3b82f6'

            // Get current year for copyright
            const currentYear = new Date().getFullYear()

            // Create AI prompt based on template type - ONLY for body content
            let aiPrompt = ''
            const baseInstructions = `
            Company: ${companyName}
            Tone: ${aiTone}
            Primary Brand Color: ${primaryColor}
            Current Year: ${currentYear} (use this for copyright footer)
            ${brandGuidelines ? `Brand Guidelines: ${brandGuidelines}` : ''}
            ${context_items && context_items.length > 0 ? `\n\nIMPORTANT: I have provided context items (files/web pages) for you to analyze. Please incorporate relevant information, styling cues, or content from these context items into the email template.` : ''}
            `

            if (type === 'Newsletter') {
              aiPrompt = `Create ONLY the HTML body content for an email newsletter template based on "${prompt}". 
              
              ${baseInstructions}
              
              Include:
              - A header with gradient background using the brand color
              - Welcome greeting with {{first_name}} placeholder
              - Main content section with highlights and bullet points
              - Call-to-action button using brand colors
              - Professional footer with company name and copyright ${currentYear}
              - Responsive design with modern styling
              - Use inline CSS for email compatibility
              
              IMPORTANT: DO NOT include an unsubscribe link - this will be added automatically to all emails. Return ONLY the HTML body content, no subject line, no backticks or code block markers, no explanation text. Start directly with HTML content.`
            } else if (type === 'Welcome Email') {
              aiPrompt = `Create ONLY the HTML body content for a welcome email template for "${prompt}".
              
              ${baseInstructions}
              
              Include:
              - Warm welcome header with celebration emoji using brand colors
              - Personalized greeting with {{first_name}} placeholder
              - Welcome message explaining what to expect
              - Getting started section with benefits
              - Prominent call-to-action button using brand colors
              - Friendly footer with company name and copyright ${currentYear}
              - Modern, friendly design with inline CSS
              
              IMPORTANT: DO NOT include an unsubscribe link - this will be added automatically to all emails. Return ONLY the HTML body content, no subject line, no backticks or code block markers, no explanation text. Start directly with HTML content.`
            } else {
              aiPrompt = `Create ONLY the HTML body content for an email template for "${prompt}" (${type}).
              
              ${baseInstructions}
              
              Include:
              - Professional header design using brand colors
              - Personalized greeting with {{first_name}} placeholder
              - Clear main content section
              - Call-to-action button using brand colors
              - Footer with company name and copyright ${currentYear}
              - Clean, modern styling with inline CSS for email compatibility
              
              IMPORTANT: DO NOT include an unsubscribe link - this will be added automatically to all emails. Return ONLY the HTML body content, no subject line, no backticks or code block markers, no explanation text. Start directly with HTML content.`
            }

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Processing with Cosmic AI...","progress":50}\n\n')
            )

            // Generate content with Cosmic AI streaming - properly include context_items
            const aiRequestPayload: any = {
              prompt: aiPrompt,
              max_tokens: 60000,
              stream: true
            }

            // CRITICAL FIX: Add context_items to the request payload if provided
            if (context_items && context_items.length > 0) {
              // Convert context items to the format expected by Cosmic AI
              const formattedContextItems = context_items.map((item: any) => ({
                url: item.url,
                type: item.type || 'webpage'
              }))
              
              aiRequestPayload.context_items = formattedContextItems
              
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Analyzing context and generating...","progress":40}\n\n')
              )
            }

            const aiResponse = await cosmic.ai.generateText(aiRequestPayload)

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
              
              // Stream the content in real-time
              controller.enqueue(
                encoder.encode(`data: {"type":"content","text":"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}","progress":70}\n\n`)
              )
            })

            aiStream.on('usage', () => {
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Finalizing template...","progress":80}\n\n')
              )
            })

            aiStream.on('end', () => {
              try {
                if (isComplete) return
                isComplete = true

                controller.enqueue(
                  encoder.encode('data: {"type":"status","message":"Template generated successfully!","progress":100}\n\n')
                )

                // Use the content as-is since we instructed AI not to use backticks
                const finalContent = generatedContent.trim()

                // Send complete response
                controller.enqueue(
                  encoder.encode(`data: {"type":"complete","data":{"content":"${finalContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}}\n\n`)
                )

                // Close the stream
                controller.close()

              } catch (endError) {
                console.error('Stream end error:', endError)
                controller.enqueue(
                  encoder.encode('data: {"type":"error","error":"Failed to finalize content"}\n\n')
                )
                controller.close()
              }
            })

            aiStream.on('error', (error: any) => {
              console.error('AI stream error:', error)
              if (!isComplete) {
                controller.enqueue(
                  encoder.encode('data: {"type":"error","error":"AI generation failed"}\n\n')
                )
                controller.close()
              }
            })

          } catch (error) {
            console.error('Generation error:', error)
            controller.enqueue(
              encoder.encode('data: {"type":"error","error":"Failed to generate content"}\n\n')
            )
            controller.close()
          }
        }, 1000)
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
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}