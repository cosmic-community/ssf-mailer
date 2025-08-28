import { NextRequest, NextResponse } from 'next/server'
import { createEmailTemplate, getEmailTemplates } from '@/lib/cosmic'

export async function GET() {
  try {
    const templates = await getEmailTemplates()
    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.subject || !body.content || !body.template_type) {
      return NextResponse.json(
        { error: 'Name, subject, content, and template type are required' },
        { status: 400 }
      )
    }

    // Create the template
    const result = await createEmailTemplate({
      name: body.name,
      subject: body.subject,
      content: body.content,
      template_type: {
        key: body.template_type.toLowerCase().replace(/\s+/g, '_'),
        value: body.template_type
      },
      active: body.active !== false
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}