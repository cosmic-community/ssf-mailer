// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMarketingCampaign, updateCampaignStatus } from '@/lib/cosmic'
import { resend } from '@/lib/resend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get campaign data
    const campaign = await getMarketingCampaign(id)
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.metadata.status.value !== 'Draft') {
      return NextResponse.json(
        { error: 'Campaign has already been sent or is not in draft status' },
        { status: 400 }
      )
    }

    const template = campaign.metadata.template
    const targetContacts = campaign.metadata.target_contacts || []

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No target contacts specified for this campaign' },
        { status: 400 }
      )
    }

    if (!template || !template.metadata) {
      return NextResponse.json(
        { error: 'Campaign template not found or invalid' },
        { status: 400 }
      )
    }

    let sent = 0
    let failed = 0
    const errors: string[] = []

    // Send emails to each contact
    for (const contact of targetContacts) {
      if (!contact.metadata?.email) {
        failed++
        errors.push(`Contact ${contact.title} has no email address`)
        continue
      }

      try {
        // Replace template variables in content
        let emailContent = template.metadata.content || ''
        let emailSubject = template.metadata.subject || ''

        if (contact.metadata.first_name) {
          emailContent = emailContent.replace(/\{\{first_name\}\}/g, contact.metadata.first_name)
          emailSubject = emailSubject.replace(/\{\{first_name\}\}/g, contact.metadata.first_name)
        }

        if (contact.metadata.last_name) {
          emailContent = emailContent.replace(/\{\{last_name\}\}/g, contact.metadata.last_name)
          emailSubject = emailSubject.replace(/\{\{last_name\}\}/g, contact.metadata.last_name)
        }

        // Send email with proper from field and error handling
        const result = await resend.emails.send({
          from: 'noreply@cosmicjs.com', // Add the required from field
          to: contact.metadata.email,
          subject: emailSubject,
          html: emailContent,
        })

        // Properly handle the result - check if it's successful or has an error
        if (result.data) {
          sent++
        } else if (result.error) {
          failed++
          errors.push(`Failed to send to ${contact.metadata.email}: ${result.error.message || 'Unknown error'}`)
        } else {
          failed++
          errors.push(`Failed to send to ${contact.metadata.email}: Unknown error`)
        }

      } catch (error) {
        failed++
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to send to ${contact.metadata.email}: ${errorMessage}`)
        console.error(`Email send error for ${contact.metadata.email}:`, error)
      }
    }

    // Update campaign status and stats
    const stats = {
      sent,
      delivered: sent, // Assume all sent emails are delivered for now
      opened: 0,
      clicked: 0,
      bounced: failed,
      unsubscribed: 0,
      open_rate: '0%',
      click_rate: '0%'
    }

    await updateCampaignStatus(id, 'Sent', stats)

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully. ${sent} emails sent, ${failed} failed.`,
      stats: {
        sent,
        failed,
        errors: errors.slice(0, 10) // Limit error messages to first 10
      }
    })

  } catch (error) {
    console.error('Campaign send error:', error)
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    )
  }
}