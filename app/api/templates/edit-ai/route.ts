import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { TextStreamingResponse } from '@cosmicjs/sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.edit_instructions || !body.current_content) {
      return NextResponse.json(
        { error: 'Edit instructions and current content are required' },
        { status: 400 }
      )
    }

    const templateType = body.template_type || 'Newsletter'
    const currentContent = body.current_content
    const currentSubject = body.current_subject || ''
    const currentName = body.current_name || ''
    const editInstructions = body.edit_instructions

    // Create a detailed prompt for AI editing with specific instructions
    const editPrompt = `You are editing an existing email template. Here are the details:

CURRENT TEMPLATE:
- Template Type: ${templateType}
- Name: ${currentName}
- Subject: ${currentSubject}
- Content: ${currentContent}

EDITING INSTRUCTIONS: ${editInstructions}

IMPORTANT EDITING GUIDELINES:
- Do not use markdown code blocks or backticks in your response
- Provide clean HTML without any formatting markers
- Return the content directly as HTML
- Keep the same overall structure but apply the requested changes
- Maintain inline CSS styling for email compatibility
- Use a maximum width of 600px with proper responsive design
- Preserve existing placeholder variables like {{first_name}}, {{company_name}} where appropriate
- Use professional styling with good color contrast and typography
- Make it mobile-friendly with proper email-safe HTML structure
- Follow email marketing best practices
- The template should remain production-ready after editing

Based on the editing instructions, modify the existing template content. If the instructions suggest changes to the subject line or name, include those as well, otherwise keep them the same.

Please provide only the updated HTML content without any explanatory text or formatting markers.`

    // Check if streaming is requested
    const isStreaming = body.stream === true

    if (isStreaming) {
      // Create streaming response
      const stream = await cosmic.ai.generateText({
        prompt: editPrompt,
        max_tokens: 60000,
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
            const result = processEditedContent(fullContent, currentName, currentSubject, editInstructions)
            
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
        prompt: editPrompt,
        max_tokens: 2000
      })

      if (!aiResponse.text) {
        throw new Error('No content generated from AI')
      }

      const result = processEditedContent(aiResponse.text, currentName, currentSubject, editInstructions)

      return NextResponse.json(result)
    }

  } catch (error) {
    console.error('AI editing error:', error)
    
    // Return the exact error from the API
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to edit template with AI' },
      { status: 500 }
    )
  }
}

// Helper function to process edited content
function processEditedContent(content: string, currentName: string, currentSubject: string, instructions: string) {
  let processedContent = content.trim()

  // Try to extract updated subject and name from AI response if editing instructions suggest changes
  let subject = currentSubject
  let name = currentName

  // Look for subject line patterns in the response if instructions mention subject
  if (instructions.toLowerCase().includes('subject')) {
    const subjectMatch = processedContent.match(/subject:\s*(.+)/i) ||
      processedContent.match(/subject line:\s*(.+)/i) ||
      processedContent.match(/<title>(.+)<\/title>/i)

    if (subjectMatch && subjectMatch[1]) {
      subject = subjectMatch[1].trim().replace(/['"]/g, '')
    }
  }

  // Update name if instructions suggest title/name changes
  if (instructions.toLowerCase().includes('name') || instructions.toLowerCase().includes('title')) {
    // Keep the current name but could be enhanced to extract from AI response
    // For now, let's keep the original name unless specifically mentioned
  }

  return {
    content: processedContent,
    subject,
    name
  }
}