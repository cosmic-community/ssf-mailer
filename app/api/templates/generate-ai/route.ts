import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

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
    
    // Create a detailed prompt for AI generation
    const detailedPrompt = `Create a professional HTML email template for a ${templateType.toLowerCase()}. 
    
User request: ${body.prompt}

Please generate:
1. A complete HTML email template with inline CSS styling
2. Use a maximum width of 600px with proper responsive design
3. Include placeholder variables like {{first_name}}, {{company_name}} where appropriate
4. Use professional styling with good color contrast and typography
5. Make it mobile-friendly
6. Include proper email-safe HTML structure

The template should be production-ready and follow email marketing best practices.`

    // Generate content using Cosmic AI
    const aiResponse = await cosmic.ai.generateText({
      prompt: detailedPrompt,
      max_tokens: 2000
    })

    if (!aiResponse.text) {
      throw new Error('No content generated from AI')
    }

    // Extract HTML content from AI response
    let content = aiResponse.text.trim()
    
    // Clean up the response if it includes markdown code blocks
    if (content.includes('