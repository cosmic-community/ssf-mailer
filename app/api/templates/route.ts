import { NextRequest, NextResponse } from 'next/server'
import { getEmailTemplates, createEmailTemplate } from '@/lib/cosmic'
import { CreateTemplateData, TemplateType } from '@/types'

export async function GET() {
  try {
    const templates = await getEmailTemplates()
    
    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateTemplateData = await request.json()
    
    // Validate required fields
    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }
    
    if (!data.subject?.trim()) {
      return NextResponse.json(
        { error: 'Subject line is required' },
        { status: 400 }
      )
    }
    
    // Validate template_type is one of the allowed values
    const validTypes: TemplateType[] = ['Welcome Email', 'Newsletter', 'Promotional', 'Transactional']
    if (!validTypes.includes(data.template_type)) {
      return NextResponse.json(
        { error: 'Invalid template type' },
        { status: 400 }
      )
    }
    
    if (!data.content?.trim()) {
      return NextResponse.json(
        { error: 'Template content is required' },
        { status: 400 }
      )
    }
    
    // Create template
    const template = await createEmailTemplate({
      name: data.name.trim(),
      subject: data.subject.trim(),
      content: data.content.trim(),
      template_type: data.template_type,
      active: data.active ?? true,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template
    })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}