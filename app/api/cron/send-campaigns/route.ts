import { NextRequest, NextResponse } from 'next/server'
import { getEmailCampaigns, updateCampaignStatus, getEmailTemplate, getSettings } from '@/lib/cosmic'
import { sendCampaignEmails } from '@/lib/resend'

export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization (optional - add auth header check if needed)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting cron job: send-campaigns')

    // Get all campaigns that are scheduled for sending
    const campaigns = await getEmailCampaigns()
    const now = new Date()
    
    const scheduledCampaigns = campaigns.filter(campaign => {
      const status = campaign.metadata.status?.value || 'Draft'
      const sendDate = campaign.metadata.send_date
      
      // Only process campaigns that are scheduled and have a send date in the past
      if (status !== 'Scheduled' || !sendDate) return false
      
      const campaignSendDate = new Date(sendDate)
      return campaignSendDate <= now
    })

    console.log(`Found ${scheduledCampaigns.length} campaigns ready to send`)

    const results = []

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`Processing campaign: ${campaign.metadata.name} (${campaign.id})`)

        // Update status to "Sending"
        await updateCampaignStatus(campaign.id, 'Sending')

        // Get the template for this campaign
        const template = await getEmailTemplate(campaign.metadata.template_id)
        if (!template) {
          console.error(`Template not found for campaign ${campaign.id}`)
          continue
        }

        // Get settings
        const settings = await getSettings()
        if (!settings) {
          console.error('Settings not found - cannot send emails')
          continue
        }

        // Send the campaign emails
        const sendResult = await sendCampaignEmails(
          campaign.id,
          template,
          campaign.metadata.target_contacts || [],
          settings,
          campaign.metadata.template_snapshot
        )

        if (sendResult.success) {
          // Update campaign status to "Sent" with stats
          await updateCampaignStatus(campaign.id, 'Sent', {
            sent: sendResult.sent_count,
            delivered: sendResult.sent_count, // Assume delivered initially
            clicked: 0,
            bounced: 0,
            unsubscribed: 0,
            click_rate: '0%'
          })

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.metadata.name,
            status: 'success',
            sent_count: sendResult.sent_count
          })

          console.log(`Successfully sent campaign ${campaign.id} to ${sendResult.sent_count} recipients`)
        } else {
          // Update campaign status back to "Scheduled" on failure
          await updateCampaignStatus(campaign.id, 'Scheduled')
          
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.metadata.name,
            status: 'failed',
            error: sendResult.error
          })

          console.error(`Failed to send campaign ${campaign.id}: ${sendResult.error}`)
        }

      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error)
        
        // Reset campaign status on error
        try {
          await updateCampaignStatus(campaign.id, 'Scheduled')
        } catch (resetError) {
          console.error(`Failed to reset campaign status for ${campaign.id}:`, resetError)
        }

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.metadata.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('Cron job completed:', results)

    return NextResponse.json({
      success: true,
      message: `Processed ${scheduledCampaigns.length} scheduled campaigns`,
      results
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}