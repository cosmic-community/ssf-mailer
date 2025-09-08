import { NextRequest, NextResponse } from 'next/server'
import { 
  getEmailCampaign, 
  updateCampaignStatus, 
  getEmailTemplate, 
  getEmailContacts,
  getSettings 
} from '@/lib/cosmic'
import { sendEmail } from '@/lib/resend'
import { TemplateSnapshot } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { sendDate } = await request.json()
    
    console.log(`Starting send process for campaign ${id}`)
    console.log('Send date:', sendDate)
    
    const campaign = await getEmailCampaign(id)
    if (!campaign) {
      console.error(`Campaign ${id} not found`)
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    console.log('Campaign metadata:', JSON.stringify(campaign.metadata, null, 2))

    const currentStatus = campaign.metadata.status?.value || 'Draft'
    console.log('Current campaign status:', currentStatus)
    
    if (currentStatus !== 'Draft') {
      console.error(`Cannot send campaign with status: ${currentStatus}`)
      return NextResponse.json(
        { error: `Cannot send campaign with status: ${currentStatus}` },
        { status: 400 }
      )
    }

    // Get template
    let template = null
    if (campaign.metadata?.template && typeof campaign.metadata.template === 'object') {
      template = campaign.metadata.template
    } else if (campaign.metadata?.template_id) {
      template = await getEmailTemplate(campaign.metadata.template_id)
    }

    if (!template || !template.metadata) {
      console.error('Template not found or invalid')
      return NextResponse.json(
        { error: 'Email template not found or invalid' },
        { status: 400 }
      )
    }

    console.log('Template found:', template.metadata.name)

    // Determine if sending now or scheduling
    const isScheduled = sendDate && sendDate !== ''
    
    if (isScheduled) {
      console.log('Scheduling campaign for:', sendDate)
      
      // Validate schedule date is in the future
      const scheduleDateTime = new Date(sendDate)
      const now = new Date()
      
      if (scheduleDateTime <= now) {
        return NextResponse.json(
          { error: 'Schedule date must be in the future' },
          { status: 400 }
        )
      }

      // Update campaign status to Scheduled
      await updateCampaignStatus(id, 'Scheduled')
      
      // Update send_date in campaign metadata
      const updateResponse = await fetch(`${request.nextUrl.origin}/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ send_date: sendDate })
      })
      
      if (!updateResponse.ok) {
        console.error('Failed to update campaign send date')
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign scheduled successfully',
        scheduledFor: scheduleDateTime.toISOString()
      })
    }

    // Get all contacts for filtering
    const allContacts = await getEmailContacts()
    console.log(`Total contacts in system: ${allContacts.length}`)

    // Collect target recipients from both contacts and tags
    let targetRecipients: typeof allContacts = []

    // Handle direct contact targeting
    if (campaign.metadata?.target_contacts && Array.isArray(campaign.metadata.target_contacts)) {
      console.log('Processing target_contacts:', campaign.metadata.target_contacts.length)
      
      campaign.metadata.target_contacts.forEach((contactRef: any) => {
        let contactId: string = ''
        
        // Handle both full contact objects and string IDs
        if (typeof contactRef === 'object' && contactRef !== null && 'id' in contactRef) {
          contactId = contactRef.id
          console.log('Found contact object with ID:', contactId)
        } else if (typeof contactRef === 'string') {
          contactId = contactRef
          console.log('Found contact ID string:', contactId)
        }
        
        if (contactId) {
          const contact = allContacts.find(c => c.id === contactId)
          if (contact) {
            targetRecipients.push(contact)
            console.log(`Added contact: ${contact.metadata?.first_name} ${contact.metadata?.last_name} (${contact.metadata?.email})`)
          } else {
            console.warn(`Contact with ID ${contactId} not found in system`)
          }
        }
      })
    }

    // Handle tag-based targeting
    if (campaign.metadata?.target_tags && Array.isArray(campaign.metadata.target_tags) && campaign.metadata.target_tags.length > 0) {
      console.log('Processing target_tags:', campaign.metadata.target_tags)
      
      const taggedContacts = allContacts.filter(contact => {
        const contactTags = contact.metadata?.tags || []
        const hasMatchingTag = campaign.metadata?.target_tags?.some(tag => contactTags.includes(tag))
        if (hasMatchingTag) {
          console.log(`Contact ${contact.metadata?.email} matches tag criteria`)
        }
        return hasMatchingTag
      })
      
      // Add tagged contacts to recipients (avoiding duplicates)
      taggedContacts.forEach(contact => {
        if (!targetRecipients.find(r => r.id === contact.id)) {
          targetRecipients.push(contact)
          console.log(`Added tagged contact: ${contact.metadata?.first_name} ${contact.metadata?.last_name} (${contact.metadata?.email})`)
        }
      })
    }

    console.log(`Total target recipients before filtering: ${targetRecipients.length}`)

    // Filter for active contacts only (not unsubscribed)
    const activeRecipients = targetRecipients.filter(contact => {
      const status = contact.metadata?.status?.value || 'Active'
      const isActive = status === 'Active'
      
      if (!isActive) {
        console.log(`Filtering out contact ${contact.metadata?.email} with status: ${status}`)
      }
      
      return isActive
    })

    console.log(`Active recipients after filtering: ${activeRecipients.length}`)

    if (activeRecipients.length === 0) {
      console.error('No active contacts found to send to')
      return NextResponse.json(
        { error: 'No active contacts found to send to. Please check that your selected contacts are not unsubscribed or bounced.' },
        { status: 400 }
      )
    }

    // Create template snapshot for preservation
    const templateSnapshot: TemplateSnapshot = {
      name: template.metadata.name,
      subject: template.metadata.subject,
      content: template.metadata.content,
      template_type: template.metadata.template_type,
      snapshot_date: new Date().toISOString(),
      original_template_id: template.id
    }

    // Update campaign status to Sending
    await updateCampaignStatus(id, 'Sending', undefined, templateSnapshot)

    console.log(`Starting to send emails to ${activeRecipients.length} recipients`)

    // Get settings for email configuration
    const settings = await getSettings()
    const fromEmail = settings?.metadata?.from_email || 'noreply@example.com'
    const fromName = settings?.metadata?.from_name || 'Email Marketing'

    // Send emails
    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const contact of activeRecipients) {
      try {
        // Replace template variables
        let emailContent = template.metadata.content
        let emailSubject = template.metadata.subject

        const firstName = contact.metadata?.first_name || ''
        const lastName = contact.metadata?.last_name || ''
        const email = contact.metadata?.email || ''

        emailContent = emailContent.replace(/\{\{first_name\}\}/g, firstName)
        emailContent = emailContent.replace(/\{\{last_name\}\}/g, lastName)
        emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, firstName)
        emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, lastName)

        console.log(`Sending email to: ${email}`)

        await sendEmail({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject: emailSubject,
          html: emailContent,
          campaignId: id,
          contactId: contact.id
        })

        sentCount++
        console.log(`Email sent successfully to: ${email}`)
      } catch (error) {
        failedCount++
        const errorMessage = `Failed to send email to ${contact.metadata?.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMessage)
        console.error(errorMessage)
      }
    }

    console.log(`Email sending complete. Sent: ${sentCount}, Failed: ${failedCount}`)

    // Calculate stats
    const stats = {
      sent: sentCount,
      delivered: sentCount, // Assume delivered = sent for now
      opened: 0,
      clicked: 0,
      bounced: failedCount,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    // Update campaign status to Sent
    await updateCampaignStatus(id, 'Sent', stats, templateSnapshot)

    console.log(`Campaign ${id} completed successfully`)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully to ${sentCount} recipients${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
      stats: {
        sent: sentCount,
        failed: failedCount,
        total: activeRecipients.length
      },
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Send campaign error:', error)
    
    // Try to update campaign status back to draft on error
    try {
      const { id } = await params
      await updateCampaignStatus(id, 'Draft')
    } catch (statusError) {
      console.error('Failed to revert campaign status:', statusError)
    }

    return NextResponse.json(
      { 
        error: 'Failed to send campaign',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}