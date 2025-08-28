import { NextRequest } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { TextStreamingResponse } from '@cosmicjs/sdk'

export async function POST(request: NextRequest) {
  try {
    const { prompt, currentContent, currentSubject, templateId } = await request.json()
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Send initial loading message
        controller.enqueue(
          encoder.encode('data: {"type":"status","message":"Starting AI content editing...","progress":10}\n\n')
        )
        
        // Process AI editing after initial delay
        setTimeout(async () => {
          try {
            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Analyzing current content...","progress":30}\n\n')
            )

            // Create AI prompt for editing
            const aiPrompt = `Please improve this HTML email template based on the following instructions: "${prompt}"

Current email template:
${currentContent}

Instructions:
- Maintain the HTML structure and email compatibility
- Keep all existing merge fields like {{first_name}}
- Apply the requested improvements while preserving functionality
- Ensure the result is still a complete, valid HTML email template
- Use inline CSS for email client compatibility
- Make improvements that enhance readability and visual appeal

Return the improved HTML email template.`

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Applying AI improvements...","progress":60}\n\n')
            )

            // Generate improved content with Cosmic AI streaming
            const aiResponse = await cosmic.ai.generateText({
              prompt: aiPrompt,
              max_tokens: 3000,
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
            
            let improvedContent = ''
            let isComplete = false

            // Process the AI stream using event listeners
            aiStream.on('text', (text: string) => {
              improvedContent += text
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Generating improvements...","progress":75}\n\n')
              )
            })

            aiStream.on('usage', () => {
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Finalizing changes...","progress":85}\n\n')
              )
            })

            aiStream.on('end', () => {
              try {
                controller.enqueue(
                  encoder.encode('data: {"type":"status","message":"Finalizing changes...","progress":90}\n\n')
                )

                // Clean up the AI response - ensure we have proper HTML
                let finalContent = improvedContent.trim()
                
                // Send the final result
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    data: {
                      content: finalContent,
                      subject: currentSubject
                    },
                    message: 'AI editing completed successfully!'
                  })}\n\n`)
                )
                
                controller.close()
                isComplete = true
              } catch (error: unknown) {
                if (!isComplete) {
                  console.error('Error finalizing AI editing:', error)
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'error',
                      error: error instanceof Error ? error.message : 'Unknown error'
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
                    error: error.message
                  })}\n\n`)
                )
                controller.close()
              }
            })

          } catch (error) {
            console.error('Error starting AI editing:', error)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Failed to process AI editing'
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
    console.error('Error in AI template editing:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process AI editing request' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}