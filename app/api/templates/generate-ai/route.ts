import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { TextStreamingResponse } from '@cosmicjs/sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const templateType = body.template_type || 'Newsletter'

    // Create a detailed prompt for AI generation with specific instructions
    const detailedPrompt = `Create a professional HTML email template for a ${templateType.toLowerCase()}. 

User request: ${body.prompt}

IMPORTANT INSTRUCTIONS:
- Do not use markdown code blocks or backticks in your response
- Provide clean HTML without any formatting markers
- Return the content directly as HTML
- Include inline CSS styling for email compatibility
- Use a maximum width of 600px with proper responsive design
- Include placeholder variables like {{first_name}}, {{company_name}} where appropriate
- Use professional styling with good color contrast and typography
- Make it mobile-friendly with proper email-safe HTML structure
- Follow email marketing best practices
- The template should be production-ready

Please generate only the HTML content without any explanatory text or formatting markers.`

    // Check if streaming is requested
    const isStreaming = body.stream === true

    if (isStreaming) {
      // Create streaming response
      const stream = await cosmic.ai.generateText({
        prompt: detailedPrompt,
        max_tokens: 2000,
        stream: true
      }) as TextStreamingResponse

      // Create a readable stream for the response
      const readableStream = new ReadableStream({
        start(controller) {
          let fullContent = ''
          
          stream.on('text', (text: string) => {
            fullContent += text
            
            // Send streaming data as Server-Sent Events
            const data = JSON.stringify({
              type: 'text',
              content: text,
              fullContent
            })
            
            controller.enqueue(`data: ${data}\n\n`)
          })

          stream.on('usage', (usage: any) => {
            const data = JSON.stringify({
              type: 'usage',
              usage
            })
            
            controller.enqueue(`data: ${data}\n\n`)
          })

          stream.on('end', () => {
            // Process the final content to extract components
            const result = processGeneratedContent(fullContent, templateType, body.prompt)
            
            const data = JSON.stringify({
              type: 'complete',
              ...result
            })
            
            controller.enqueue(`data: ${data}\n\n`)
            controller.close()
          })

          stream.on('error', (error: any) => {
            const data = JSON.stringify({
              type: 'error',
              error: error.message || 'Stream error occurred'
            })
            
            controller.enqueue(`data: ${data}\n\n`)
            controller.close()
          })
        }
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    } else {
      // Non-streaming response (backward compatibility)
      const aiResponse = await cosmic.ai.generateText({
        prompt: detailedPrompt,
        max_tokens: 2000
      })

      if (!aiResponse.text) {
        throw new Error('No content generated from AI')
      }

      const result = processGeneratedContent(aiResponse.text, templateType, body.prompt)

      return NextResponse.json(result)
    }

  } catch (error) {
    console.error('AI generation error:', error)
    
    // Return the exact error from the API
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate template with AI' },
      { status: 500 }
    )
  }
}

// Helper function to process generated content
function processGeneratedContent(content: string, templateType: string, prompt: string) {
  let processedContent = content.trim()

  // Try to extract subject and name from AI response
  let subject = ''
  let name = ''

  // Look for subject line patterns in the response
  const subjectMatch = processedContent.match(/subject:\s*(.+)/i) ||
    processedContent.match(/subject line:\s*(.+)/i) ||
    processedContent.match(/<title>(.+)<\/title>/i)

  if (subjectMatch && subjectMatch[1]) {
    subject = subjectMatch[1].trim().replace(/['"]/g, '')
  }

  // Generate a default name based on template type and prompt
  const promptWords = prompt.split(' ').slice(0, 3).join(' ')
  name = `AI ${templateType} - ${promptWords}`

  return {
    content: processedContent,
    subject,
    name
  }
}