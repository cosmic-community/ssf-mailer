// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus, getEmailContacts } from '@/lib/cosmic'
import { sendEmail } from '@/lib/resend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get the campaign
    const campaign = await getMarketingCampaign(id)
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign is in Draft status
    if (campaign.metadata?.status?.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Only draft campaigns can be sent' },
        { status: 400 }
      )
    }

    // Update campaign status to Sending
    await updateCampaignStatus(id, 'Sending')

    try {
      // Get all contacts for targeting
      const allContacts = await getEmailContacts()
      
      // Determine target recipients
      let targetContacts = []
      
      // Add specific contacts
      if (campaign.metadata?.target_contacts && campaign.metadata.target_contacts.length > 0) {
        targetContacts.push(...campaign.metadata.target_contacts)
      }
      
      // Add contacts by tags
      if (campaign.metadata?.target_tags && campaign.metadata.target_tags.length > 0) {
        const taggedContacts = allContacts.filter(contact => 
          contact.metadata?.tags && 
          contact.metadata.tags.some((tag: string) => 
            campaign.metadata?.target_tags?.includes(tag)
          )
        )
        targetContacts.push(...taggedContacts)
      }

      // Remove duplicates based on email
      const uniqueContacts = targetContacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.metadata?.email === contact.metadata?.email)
      )

      // Only send to active contacts
      const activeContacts = uniqueContacts.filter(contact => 
        contact.metadata?.status?.value === 'Active'
      )

      if (activeContacts.length === 0) {
        await updateCampaignStatus(id, 'Draft')
        return NextResponse.json(
          { error: 'No active contacts found for this campaign' },
          { status: 400 }
        )
      }

      // Get template data
      const template = campaign.metadata?.template
      if (!template || !template.metadata) {
        await updateCampaignStatus(id, 'Draft')
        return NextResponse.json(
          { error: 'Campaign template not found' },
          { status: 400 }
        )
      }

      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      // Send emails to each contact
      for (const contact of activeContacts) {
        try {
          if (!contact.metadata?.email) {
            failCount++
            errors.push(`Contact ${contact.title} has no email address`)
            continue
          }

          // Personalize the email content
          let personalizedContent = template.metadata.content
          let personalizedSubject = template.metadata.subject

          // Replace placeholders
          const firstName = contact.metadata.first_name || 'there'
          const lastName = contact.metadata.last_name || ''
          
          personalizedContent = personalizedContent
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{last_name\}\}/g, lastName)
            .replace(/\{\{name\}\}/g, `${firstName} ${lastName}`.trim())

          personalizedSubject = personalizedSubject
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{last_name\}\}/g, lastName)
            .replace(/\{\{name\}\}/g, `${firstName} ${lastName}`.trim())

          // Send the email
          await sendEmail({
            to: contact.metadata.email,
            subject: personalizedSubject,
            html: personalizedContent,
            from: 'tony@cosmicjs.com'
          })

          successCount++
        } catch (error) {
          failCount++
          console.error(`Failed to send email to ${contact.metadata?.email}:`, error)
          errors.push(`Failed to send to ${contact.metadata?.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Calculate stats
      const totalSent = successCount
      const openRate = '0%' // This would be tracked with email tracking pixels in a real system
      const clickRate = '0%' // This would be tracked with tracked links in a real system

      const stats = {
        sent: totalSent,
        delivered: totalSent, // Assuming all sent emails are delivered for now
        opened: 0,
        clicked: 0,
        bounced: failCount,
        unsubscribed: 0,
        open_rate: openRate,
        click_rate: clickRate
      }

      // Update campaign status to Sent with stats
      await updateCampaignStatus(id, 'Sent', stats)

      return NextResponse.json({
        success: true,
        message: `Campaign sent successfully to ${successCount} recipients`,
        stats: {
          sent: successCount,
          failed: failCount,
          errors: errors.length > 0 ? errors : undefined
        }
      })

    } catch (sendError) {
      // If sending fails, revert campaign status to Draft
      await updateCampaignStatus(id, 'Draft')
      throw sendError
    }

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send campaign' },
      { status: 500 }
    )
  }
}