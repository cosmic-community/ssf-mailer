// app/api/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getEmailTemplate, updateEmailTemplate, deleteEmailTemplate } from '@/lib/cosmic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const template = await getEmailTemplate(id)
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.subject || !body.content || !body.template_type) {
      return NextResponse.json(
        { error: 'Name, subject, content, and template type are required' },
        { status: 400 }
      )
    }

    const result = await updateEmailTemplate(id, {
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
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await deleteEmailTemplate(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}