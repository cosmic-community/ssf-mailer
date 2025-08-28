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

            // Create AI prompt for editing - ONLY for body content
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

IMPORTANT: Return ONLY the improved HTML email template without any backticks, code block markers, or additional text. Start directly with the HTML content.`

            controller.enqueue(
              encoder.encode('data: {"type":"status","message":"Applying AI improvements...","progress":60}\n\n')
            )

            // Generate improved content with Cosmic AI streaming
            const aiResponse = await cosmic.ai.generateText({
              prompt: aiPrompt,
              max_tokens: 3000,
              stream: true
            })

            // Handle both streaming and non-streaming responses
            if (aiResponse && typeof aiResponse === 'object' && 'on' in aiResponse) {
              // Streaming response
              const aiStream = aiResponse as TextStreamingResponse
              let improvedContent = ''
              let isComplete = false

              aiStream.on('text', (text: string) => {
                improvedContent += text
                
                // Stream the content in real-time
                controller.enqueue(
                  encoder.encode(`data: {"type":"content","text":"${text.replace(/"/g, '\\"').replace(/\n/g, '\\n')}","progress":75}\n\n`)
                )
              })

              aiStream.on('end', () => {
                try {
                  if (isComplete) return
                  isComplete = true

                  controller.enqueue(
                    encoder.encode('data: {"type":"status","message":"AI editing completed successfully!","progress":100}\n\n')
                  )

                  // Use the content as-is since we instructed AI not to use backticks
                  const finalContent = improvedContent.trim()

                  // Send complete response with content only
                  controller.enqueue(
                    encoder.encode(`data: {"type":"complete","data":{"content":"${finalContent.replace(/"/g, '\\"').replace(/\n/g, '\\n')}","subject":"${currentSubject?.replace(/"/g, '\\"') || ''}"}}\n\n`)
                  )

                  controller.close()
                } catch (endError) {
                  console.error('Stream end error:', endError)
                  controller.enqueue(
                    encoder.encode('data: {"type":"error","error":"Failed to complete editing"}\n\n')
                  )
                  controller.close()
                }
              })

              aiStream.on('error', (error: any) => {
                console.error('AI stream error:', error)
                if (!isComplete) {
                  controller.enqueue(
                    encoder.encode('data: {"type":"error","error":"AI editing failed"}\n\n')
                  )
                  controller.close()
                }
              })

            } else {
              // Non-streaming response fallback
              const content = typeof aiResponse === 'string' ? aiResponse : 'Failed to generate content'
              
              controller.enqueue(
                encoder.encode('data: {"type":"status","message":"Processing complete!","progress":100}\n\n')
              )
              
              controller.enqueue(
                encoder.encode(`data: {"type":"complete","data":{"content":"${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}","subject":"${currentSubject?.replace(/"/g, '\\"') || ''}"}}\n\n`)
              )
              
              controller.close()
            }

          } catch (error) {
            console.error('AI editing error:', error)
            controller.enqueue(
              encoder.encode('data: {"type":"error","error":"Failed to edit content"}\n\n')
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
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}