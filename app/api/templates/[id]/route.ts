// app/api/templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Handle template_type - extract value if it's an object, otherwise use as-is
    let templateType = body.template_type
    if (typeof templateType === 'object' && templateType.value) {
      templateType = templateType.value
    }

    // Update the template with correct metadata structure matching Cosmic CMS object type
    const result = await cosmic.objects.updateOne(id, {
      title: body.name,
      metadata: {
        name: body.name,
        subject: body.subject,
        content: body.content,
        template_type: templateType, // Use the exact select-dropdown value
        active: body.active ?? true
      }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await cosmic.objects.deleteOne(id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}