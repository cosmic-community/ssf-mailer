import { NextRequest, NextResponse } from 'next/server'
import { cosmic } from '@/lib/cosmic'
import { revalidatePath } from 'next/cache'

export async function DELETE(request: NextRequest) {
  try {
    const { contactIds } = await request.json()
    
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Contact IDs array is required' },
        { status: 400 }
      )
    }

    // Delete contacts in parallel
    const results = await Promise.allSettled(
      contactIds.map((id: string) => cosmic.objects.deleteOne(id))
    )

    // Count successful deletions
    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.length - successful

    // Revalidate the contacts page
    revalidatePath('/contacts')

    return NextResponse.json({
      success: true,
      deleted: successful,
      failed: failed,
      message: `Successfully deleted ${successful} contact${successful !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`
    })
  } catch (error) {
    console.error('Error deleting contacts:', error)
    return NextResponse.json(
      { error: 'Failed to delete contacts' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { contactIds, updates } = await request.json()
    
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'Contact IDs array is required' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      )
    }

    // First, fetch all contacts to get current data
    const contactsResponse = await Promise.allSettled(
      contactIds.map(async (id: string) => {
        try {
          const { object } = await cosmic.objects.findOne({ id }).depth(0)
          return object
        } catch (error) {
          throw new Error(`Contact ${id} not found`)
        }
      })
    )

    const contacts = contactsResponse
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No valid contacts found' },
        { status: 404 }
      )
    }

    // Update contacts in parallel
    const updateResults = await Promise.allSettled(
      contacts.map(async (contact) => {
        const updatedMetadata = { ...contact.metadata }
        
        // Update status if provided
        if (updates.status) {
          updatedMetadata.status = {
            key: updates.status.toLowerCase(),
            value: updates.status
          }
        }
        
        // Update tags if provided
        if (updates.tags !== undefined) {
          if (updates.tagAction === 'add') {
            // Add new tags to existing ones
            const currentTags: string[] = contact.metadata.tags || []
            const newTags: string[] = Array.from(new Set([...currentTags, ...updates.tags]))
            updatedMetadata.tags = newTags
          } else if (updates.tagAction === 'remove') {
            // Remove specified tags
            const currentTags: string[] = contact.metadata.tags || []
            updatedMetadata.tags = currentTags.filter((tag: string) => !updates.tags.includes(tag))
          } else {
            // Replace all tags (default behavior)
            updatedMetadata.tags = updates.tags
          }
        }

        return cosmic.objects.updateOne(contact.id, {
          metadata: updatedMetadata
        })
      })
    )

    // Count successful updates
    const successful = updateResults.filter(result => result.status === 'fulfilled').length
    const failed = updateResults.length - successful

    // Revalidate the contacts page
    revalidatePath('/contacts')

    return NextResponse.json({
      success: true,
      updated: successful,
      failed: failed,
      message: `Successfully updated ${successful} contact${successful !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`
    })
  } catch (error) {
    console.error('Error updating contacts:', error)
    return NextResponse.json(
      { error: 'Failed to update contacts' },
      { status: 500 }
    )
  }
}