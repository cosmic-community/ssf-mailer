import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, currentContent, type } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Simulate AI content editing with a delay for better UX
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate improved content based on the prompt and current content
    let improvedContent = ''
    
    if (prompt.toLowerCase().includes('improve') || prompt.toLowerCase().includes('enhance')) {
      // If asking for general improvements
      improvedContent = currentContent.replace(
        /font-size: 14px/g, 'font-size: 16px'
      ).replace(
        /color: #666/g, 'color: #555555'
      ).replace(
        /padding: 20px/g, 'padding: 30px'
      )
    } else if (prompt.toLowerCase().includes('modern') || prompt.toLowerCase().includes('update')) {
      // If asking for modern styling
      improvedContent = currentContent.replace(
        /background: #[a-fA-F0-9]{6}/g, 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      ).replace(
        /border-radius: \d+px/g, 'border-radius: 8px'
      ).replace(
        /font-family: [^;]+/g, 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif'
      )
    } else if (prompt.toLowerCase().includes('professional')) {
      // If asking for professional styling
      improvedContent = currentContent.replace(
        /color: #[a-fA-F0-9]{6}/g, 'color: #1a1a1a'
      ).replace(
        /background-color: #[a-fA-F0-9]{6}/g, 'background-color: #ffffff'
      ).replace(
        /<h1[^>]*>(.*?)<\/h1>/g, '<h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px 0; line-height: 1.3;">$1</h1>'
      )
    } else {
      // For other prompts, make subtle improvements
      improvedContent = currentContent.replace(
        /margin: 10px/g, 'margin: 15px'
      ).replace(
        /padding: 10px/g, 'padding: 15px'
      ).replace(
        /line-height: 1.4/g, 'line-height: 1.6'
      )
    }
    
    // If no changes were made, add some basic improvements
    if (improvedContent === currentContent) {
      improvedContent = currentContent.replace(
        /<style>/,
        `<style>
        /* AI Enhanced Styles */`
      ).replace(
        /line-height: 1\.\d+/g, 'line-height: 1.6'
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        content: improvedContent
      }
    })
  } catch (error) {
    console.error('Error editing AI content:', error)
    return NextResponse.json(
      { error: 'Failed to edit AI content' },
      { status: 500 }
    )
  }
}