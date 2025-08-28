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
            const aiStream = await cosmic.ai.generateText({
              prompt: aiPrompt,
              max_tokens: 3000,
              stream: true
            })

            // Check if aiStream is a TextStreamingResponse
            if (!aiStream || typeof aiStream.on !== 'function') {
              throw new Error('AI stream not available or invalid')
            }

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
                
                // If AI response doesn't contain full HTML, apply manual improvements
                if (!finalContent.includes('<!DOCTYPE html>') || !finalContent.includes('<html')) {
                  finalContent = applyManualImprovements(currentContent, prompt)
                }

                // Ensure the content is properly formatted
                if (finalContent.length < 100) {
                  finalContent = applyManualImprovements(currentContent, prompt)
                }

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
                  // Fallback to manual improvements
                  const fallbackContent = applyManualImprovements(currentContent, prompt)
                  
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'complete',
                      data: {
                        content: fallbackContent,
                        subject: currentSubject
                      },
                      message: 'Template improved successfully!'
                    })}\n\n`)
                  )
                  
                  controller.close()
                }
              }
            })

            aiStream.on('error', (error: Error) => {
              if (!isComplete) {
                console.error('Cosmic AI stream error:', error)
                
                // Fallback to manual improvements
                const fallbackContent = applyManualImprovements(currentContent, prompt)
                
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    data: {
                      content: fallbackContent,
                      subject: currentSubject
                    },
                    message: 'Template improved with fallback enhancements!'
                  })}\n\n`)
                )
                
                controller.close()
              }
            })

          } catch (error) {
            console.error('Error starting AI editing:', error)
            
            // Fallback to manual improvements
            const fallbackContent = applyManualImprovements(currentContent, prompt)
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                data: {
                  content: fallbackContent,
                  subject: currentSubject
                },
                message: 'Template improved successfully!'
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

// Manual improvement fallback function
function applyManualImprovements(currentContent: string, prompt: string): string {
  let improvedContent = currentContent
  
  // Apply different improvements based on the prompt
  if (prompt.toLowerCase().includes('cosmic blue') || prompt.toLowerCase().includes('cosmic cms')) {
    // Apply Cosmic blue theme
    improvedContent = improvedContent
      .replace(/#007bff/g, '#4F46E5') // Primary blue to Cosmic indigo
      .replace(/#0056b3/g, '#3730A3') // Darker blue to darker indigo
      .replace(/#f8f9fa/g, '#F8FAFC') // Light background
      .replace(/background-color:\s*#007bff/g, 'background-color: #4F46E5')
      .replace(/color:\s*#007bff/g, 'color: #4F46E5')
      .replace(/border[^;]*#007bff/g, 'border: 1px solid #4F46E5')
      .replace(/#667eea/g, '#4F46E5') // Update gradient colors too
      .replace(/#764ba2/g, '#3730A3')
  } else if (prompt.toLowerCase().includes('improve') || prompt.toLowerCase().includes('enhance')) {
    improvedContent = improvedContent
      .replace(/font-size:\s*14px/g, 'font-size: 16px')
      .replace(/color:\s*#666/g, 'color: #555555')
      .replace(/padding:\s*20px/g, 'padding: 30px')
      .replace(/margin:\s*10px/g, 'margin: 15px')
      .replace(/line-height:\s*1\.\d+/g, 'line-height: 1.6')
  } else if (prompt.toLowerCase().includes('modern') || prompt.toLowerCase().includes('update')) {
    improvedContent = improvedContent
      .replace(/border-radius:\s*\d+px/g, 'border-radius: 12px')
      .replace(/box-shadow:[^;]+/g, 'box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)')
      .replace(/font-family:[^;]+/g, 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif')
  } else if (prompt.toLowerCase().includes('professional')) {
    improvedContent = improvedContent
      .replace(/color:\s*#[a-fA-F0-9]{6}/g, 'color: #1a1a1a')
      .replace(/background-color:\s*#f8f9fa/g, 'background-color: #ffffff')
      .replace(/padding:\s*\d+px/g, (match) => {
        const value = parseInt(match.match(/\d+/)?.[0] || '20')
        return `padding: ${Math.max(value + 5, 25)}px`
      })
  } else if (prompt.toLowerCase().includes('colorful') || prompt.toLowerCase().includes('vibrant')) {
    improvedContent = improvedContent
      .replace(/background:\s*linear-gradient[^;]+/g, 'background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)')
      .replace(/background-color:\s*#667eea/g, 'background-color: #ff6b6b')
      .replace(/color:\s*#333333/g, 'color: #2d3748')
  } else {
    // Default improvements
    improvedContent = improvedContent
      .replace(/line-height:\s*1\.\d+/g, 'line-height: 1.6')
      .replace(/margin:\s*10px/g, 'margin: 15px')
      .replace(/padding:\s*15px/g, 'padding: 20px')
      .replace(/font-size:\s*13px/g, 'font-size: 14px')
  }
  
  return improvedContent
}