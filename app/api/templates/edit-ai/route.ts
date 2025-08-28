import { NextRequest } from 'next/server'

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
        
        // Simulate processing steps with progress updates
        setTimeout(() => {
          controller.enqueue(
            encoder.encode('data: {"type":"status","message":"Analyzing current content...","progress":30}\n\n')
          )
        }, 500)
        
        setTimeout(() => {
          controller.enqueue(
            encoder.encode('data: {"type":"status","message":"Applying AI improvements...","progress":60}\n\n')
          )
        }, 1000)
        
        setTimeout(() => {
          controller.enqueue(
            encoder.encode('data: {"type":"status","message":"Finalizing changes...","progress":90}\n\n')
          )
        }, 1500)
        
        // Process the AI editing after delays
        setTimeout(() => {
          try {
            let improvedContent = currentContent
            let improvedSubject = currentSubject
            
            // Apply different improvements based on the prompt
            if (prompt.toLowerCase().includes('cosmic blue') || prompt.toLowerCase().includes('cosmic cms')) {
              // Apply Cosmic blue theme
              improvedContent = currentContent
                .replace(/#007bff/g, '#4F46E5') // Primary blue to Cosmic indigo
                .replace(/#0056b3/g, '#3730A3') // Darker blue to darker indigo
                .replace(/#f8f9fa/g, '#F8FAFC') // Light background
                .replace(/background-color: #007bff/g, 'background-color: #4F46E5')
                .replace(/color: #007bff/g, 'color: #4F46E5')
                .replace(/border.*?#007bff/g, 'border: 4px solid #4F46E5')
            } else if (prompt.toLowerCase().includes('improve') || prompt.toLowerCase().includes('enhance')) {
              improvedContent = currentContent
                .replace(/font-size: 14px/g, 'font-size: 16px')
                .replace(/color: #666/g, 'color: #555555')
                .replace(/padding: 20px/g, 'padding: 30px')
                .replace(/margin: 10px/g, 'margin: 15px')
            } else if (prompt.toLowerCase().includes('modern') || prompt.toLowerCase().includes('update')) {
              improvedContent = currentContent
                .replace(/border-radius: \d+px/g, 'border-radius: 12px')
                .replace(/box-shadow: [^;]+/g, 'box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)')
                .replace(/font-family: [^;]+/g, 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif')
            } else if (prompt.toLowerCase().includes('professional')) {
              improvedContent = currentContent
                .replace(/color: #[a-fA-F0-9]{6}/g, 'color: #1a1a1a')
                .replace(/background-color: #f8f9fa/g, 'background-color: #ffffff')
            } else {
              // Default improvements
              improvedContent = currentContent
                .replace(/line-height: 1\.\d+/g, 'line-height: 1.6')
                .replace(/margin: 10px/g, 'margin: 15px')
            }
            
            // Send the final result
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                data: {
                  content: improvedContent,
                  subject: improvedSubject
                },
                message: 'AI editing completed successfully!'
              })}\n\n`)
            )
            
            controller.close()
          } catch (error) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: 'Failed to process AI editing'
              })}\n\n`)
            )
            controller.close()
          }
        }, 2000)
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