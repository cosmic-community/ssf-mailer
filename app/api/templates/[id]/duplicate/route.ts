// app/api/templates/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { EmailTemplate } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // First, fetch the original template
    const { object: originalTemplate } = await cosmic.objects.findOne({
      id: id,
      type: 'email-templates'
    }).depth(1) as { object: EmailTemplate }

    if (!originalTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create a new template name with "(Copy)" suffix
    const originalName = originalTemplate.metadata?.name || originalTemplate.title
    const copyName = `${originalName} (Copy)`

    // Create the duplicate template with proper metadata structure
    const duplicatedTemplate = await cosmic.objects.insertOne({
      title: copyName,
      type: 'email-templates',
      metadata: {
        name: copyName,
        subject: originalTemplate.metadata?.subject || '',
        content: originalTemplate.metadata?.content || '',
        template_type: originalTemplate.metadata?.template_type?.value || 'Newsletter',
        active: false, // Set duplicates as inactive by default
        preview_image: originalTemplate.metadata?.preview_image || null
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: duplicatedTemplate,
      message: `Template "${originalName}" duplicated successfully as "${copyName}"`
    })
  } catch (error: any) {
    console.error('Error duplicating template:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate template' },
      { status: 500 }
    )
  }
}