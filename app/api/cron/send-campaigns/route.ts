import { NextRequest, NextResponse } from 'next/server'
import { getEmailCampaigns, updateCampaignStatus, getEmailTemplate, getSettings, updateCampaignProgress, getEmailContacts } from '@/lib/cosmic'
import { sendCampaignEmails } from '@/lib/resend'
import { EmailContact } from '@/types'

export async function GET(request: NextRequest) {
  try {
    // Verify cron authorization (optional - add auth header check if needed)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🚀 Starting cron job: send-campaigns')

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

    console.log(`📧 Found ${scheduledCampaigns.length} campaigns ready to send`)

    const results = []

    for (const campaign of scheduledCampaigns) {
      try {
        console.log(`📋 Processing campaign: ${campaign.metadata.name} (${campaign.id})`)

        // Update status to "Sending" to prevent duplicate processing
        await updateCampaignStatus(campaign.id, 'Sending')

        // Get the template for this campaign - handle the new template field structure
        let template = null
        if (typeof campaign.metadata?.template === 'object') {
          template = campaign.metadata.template
        } else if (typeof campaign.metadata?.template === 'string') {
          template = await getEmailTemplate(campaign.metadata.template)
        }

        if (!template) {
          console.error(`❌ Template not found for campaign ${campaign.id}`)
          // Reset campaign status back to scheduled
          await updateCampaignStatus(campaign.id, 'Scheduled')
          continue
        }

        // Get settings
        const settings = await getSettings()
        if (!settings) {
          console.error('❌ Settings not found - cannot send emails')
          // Reset campaign status back to scheduled
          await updateCampaignStatus(campaign.id, 'Scheduled')
          continue
        }

        // Fix: Get all email contacts and filter by target contact IDs
        const allContacts = await getEmailContacts()
        const targetContactIds = campaign.metadata.target_contacts || []
        
        // Filter contacts by IDs and ensure they're active
        const activeContacts: EmailContact[] = allContacts.filter(contact => 
          targetContactIds.includes(contact.id) && 
          contact.metadata?.status?.value === 'Active'
        )

        if (activeContacts.length === 0) {
          console.error(`❌ No active contacts found for campaign ${campaign.id}`)
          // Reset campaign status back to scheduled
          await updateCampaignStatus(campaign.id, 'Scheduled')
          continue
        }

        console.log(`📊 Campaign ${campaign.id}: ${activeContacts.length} active contacts to process`)

        // Initialize progress tracking
        await updateCampaignProgress(campaign.id, {
          sent: 0,
          failed: 0,
          total: activeContacts.length,
          progress_percentage: 0,
          last_batch_completed: new Date().toISOString()
        })

        // Send the campaign emails with batching and rate limiting
        const sendResult = await sendCampaignEmails(
          campaign.id,
          template,
          activeContacts,
          settings,
          campaign.metadata.template_snapshot
        )

        if (sendResult.success) {
          // Calculate final stats
          const failedCount = activeContacts.length - sendResult.sent_count
          const successRate = activeContacts.length > 0 ? Math.round((sendResult.sent_count / activeContacts.length) * 100) : 0
          
          // Update campaign status to "Sent" with final stats
          await updateCampaignStatus(campaign.id, 'Sent', {
            sent: sendResult.sent_count,
            delivered: sendResult.sent_count, // Assume delivered initially
            opened: 0,
            clicked: 0,
            bounced: failedCount,
            unsubscribed: 0,
            open_rate: '0%',
            click_rate: '0%'
          })

          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.metadata.name,
            status: 'success',
            sent_count: sendResult.sent_count,
            failed_count: failedCount,
            success_rate: `${successRate}%`,
            total_contacts: activeContacts.length
          })

          console.log(`✅ Successfully completed campaign ${campaign.id}`)
          console.log(`   📊 Stats: ${sendResult.sent_count}/${activeContacts.length} sent (${successRate}% success rate)`)
        } else {
          // Update campaign status back to "Scheduled" on failure
          await updateCampaignStatus(campaign.id, 'Scheduled')
          
          results.push({
            campaign_id: campaign.id,
            campaign_name: campaign.metadata.name,
            status: 'failed',
            error: sendResult.error,
            total_contacts: activeContacts.length
          })

          console.error(`❌ Failed to send campaign ${campaign.id}: ${sendResult.error}`)
        }

      } catch (error) {
        console.error(`💥 Error processing campaign ${campaign.id}:`, error)
        
        // Reset campaign status on error
        try {
          await updateCampaignStatus(campaign.id, 'Scheduled')
        } catch (resetError) {
          console.error(`❌ Failed to reset campaign status for ${campaign.id}:`, resetError)
        }

        results.push({
          campaign_id: campaign.id,
          campaign_name: campaign.metadata.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('🎯 Cron job completed successfully')
    console.log('📈 Results summary:', results)

    return NextResponse.json({
      success: true,
      message: `Processed ${scheduledCampaigns.length} scheduled campaigns`,
      processed_count: scheduledCampaigns.length,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('💥 Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}