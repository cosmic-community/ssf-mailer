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

            // Create AI prompt based on template type - ONLY for body content
            let aiPrompt = ''
            if (type === 'Newsletter') {
              aiPrompt = `Create ONLY the HTML body content for an email newsletter template based on "${prompt}". Include:
              - A header with gradient background
              - Welcome greeting with {{first_name}} placeholder
              - Main content section with highlights and bullet points
              - Call-to-action button
              - Professional footer with unsubscribe link
              - Responsive design with modern styling
              - Use inline CSS for email compatibility
              
              IMPORTANT: Return ONLY the HTML body content, no subject line, no backticks, no explanation text.`
            } else if (type === 'Welcome Email') {
              aiPrompt = `Create ONLY the HTML body content for a welcome email template for "${prompt}". Include:
              - Warm welcome header with celebration emoji
              - Personalized greeting with {{first_name}} placeholder
              - Welcome message explaining what to expect
              - Getting started section with benefits
              - Prominent call-to-action button
              - Friendly footer with contact information
              - Modern, friendly design with inline CSS
              
              IMPORTANT: Return ONLY the HTML body content, no subject line, no backticks, no explanation text.`
            } else {
              aiPrompt = `Create ONLY the HTML body content for an email template for "${prompt}" (${type}). Include:
              - Professional header design
              - Personalized greeting with {{first_name}} placeholder
              - Clear main content section
              - Call-to-action button
              - Footer with contact information
              - Clean, modern styling with inline CSS for email compatibility
              
              IMPORTANT: Return ONLY the HTML body content, no subject line, no backticks, no explanation text.`
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

                // Clean up the AI response - remove backticks and code block markers
                let cleanContent = generatedContent.trim()
                
                // Remove markdown code block markers with properly escaped regex
                cleanContent = cleanContent.replace(/^