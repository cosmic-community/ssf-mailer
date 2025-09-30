import { NextRequest, NextResponse } from "next/server";
import {
  getMarketingCampaigns,
  updateCampaignStatus,
  updateCampaignProgress,
  getSettings,
  updateEmailCampaign,
  createCampaignSend,
  getCampaignSendStats,
  filterUnsentContacts,
  getCampaignTargetContacts,
  reserveContactsForSending,
} from "@/lib/cosmic";
import { sendEmail, ResendRateLimitError } from "@/lib/resend";
import { createUnsubscribeUrl, addTrackingToEmail } from "@/lib/email-tracking";
import { MarketingCampaign, EmailContact } from "@/types";

// Rate limiting configuration for Resend API
const EMAILS_PER_SECOND = 8; // Stay safely under 10/sec limit with 20% buffer
const MIN_DELAY_MS = Math.ceil(1000 / EMAILS_PER_SECOND); // ~125ms per email
const BATCH_SIZE = 100; // Process 100 emails at a time
const MAX_BATCHES_PER_RUN = 10; // Process max 10 batches per cron run (1,000 emails)

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional - can be removed for manual testing)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // For development/testing, allow requests without cron secret
      console.log(
        "Warning: No valid cron secret provided. This should only happen in development."
      );
    }

    const now = new Date();
    console.log(`Cron job started: Processing sending campaigns at ${now.toISOString()} (UTC)`);
    console.log(`Rate limit: ${EMAILS_PER_SECOND} emails/sec (min ${MIN_DELAY_MS}ms between sends)`);

    // Get all campaigns that are in "Sending" status
    const campaigns = await getMarketingCampaigns();
    const sendingCampaigns = campaigns.filter(
      (campaign) => campaign.metadata.status?.value === "Sending"
    );

    console.log(`Found ${sendingCampaigns.length} campaigns to process`);

    if (sendingCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No campaigns to process",
        processed: 0,
      });
    }

    // Get settings for from email, etc.
    const settings = await getSettings();
    if (!settings) {
      console.error("No settings found - cannot send emails");
      return NextResponse.json(
        { error: "Email settings not configured" },
        { status: 500 }
      );
    }

    let totalProcessed = 0;

    // Process each sending campaign
    for (const campaign of sendingCampaigns) {
      try {
        // Check if campaign is scheduled for future
        const sendDate = campaign.metadata.send_date;
        if (sendDate) {
          const scheduledTime = new Date(sendDate);
          
          console.log(`Campaign "${campaign.metadata.name}" schedule check:`, {
            scheduledTime: scheduledTime.toISOString(),
            currentTime: now.toISOString(),
            shouldSend: scheduledTime <= now,
          });
          
          // Only process if scheduled time has passed
          if (scheduledTime > now) {
            console.log(`Skipping "${campaign.metadata.name}" - scheduled for ${scheduledTime.toISOString()}`);
            continue;
          }
        }

        // Check rate limit cooldown
        if (campaign.metadata.rate_limit_hit_at) {
          const hitAt = new Date(campaign.metadata.rate_limit_hit_at);
          const retryAfter = campaign.metadata.retry_after || 3600;
          const canRetryAt = new Date(hitAt.getTime() + retryAfter * 1000);
          
          if (now < canRetryAt) {
            console.log(
              `Skipping campaign ${campaign.id} - rate limit cooldown until ${canRetryAt.toISOString()}`
            );
            continue;
          }
          
          // Clear rate limit flag since we can retry now
          console.log(`Clearing rate limit flag for campaign ${campaign.id}`);
          await updateEmailCampaign(campaign.id, {
            rate_limit_hit_at: null,
            retry_after: null,
          } as any);
        }

        console.log(
          `Processing campaign: ${campaign.metadata.name} (${campaign.id})`
        );

        const result = await processCampaignBatch(campaign, settings);
        totalProcessed += result.processed;

        // If campaign is completed, update status and save sent_at timestamp
        if (result.completed) {
          const sentAt = new Date().toISOString();
          
          // Update campaign with Sent status and sent_at timestamp
          await updateCampaignStatus(campaign.id, "Sent", result.finalStats);
          
          // Also update the sent_at field using the cosmic library
          const { cosmic } = await import("@/lib/cosmic");
          await cosmic.objects.updateOne(campaign.id, {
            metadata: {
              sent_at: sentAt,
            },
          });
          
          console.log(`Campaign ${campaign.id} completed and marked as Sent at ${sentAt}`);
        }
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);

        // Update campaign with error status
        await updateCampaignStatus(campaign.id, "Cancelled", {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          open_rate: "0%",
          click_rate: "0%",
        });
      }
    }

    console.log(
      `Cron job completed. Processed ${totalProcessed} emails across ${sendingCampaigns.length} campaigns`
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} emails across ${sendingCampaigns.length} campaigns`,
      processed: totalProcessed,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

async function processCampaignBatch(
  campaign: MarketingCampaign,
  settings: any
) {
  // Get all target contacts for this campaign
  const allContacts = await getCampaignTargetContacts(campaign);
  console.log(`Campaign ${campaign.id}: Total contacts = ${allContacts.length}`);

  // Filter out contacts that have already been sent to (including pending)
  const unsentContactIds = await filterUnsentContacts(
    campaign.id,
    allContacts.map((c) => c.id)
  );

  const unsentContacts = allContacts.filter((c) =>
    unsentContactIds.includes(c.id)
  );

  console.log(
    `Campaign ${campaign.id}: ${allContacts.length - unsentContacts.length} already sent/reserved, ${unsentContacts.length} remaining`
  );

  if (unsentContacts.length === 0) {
    console.log(`Campaign ${campaign.id} is complete!`);
    const stats = await getCampaignSendStats(campaign.id);
    return {
      processed: 0,
      completed: true,
      finalStats: {
        sent: stats.sent,
        delivered: stats.sent,
        opened: 0,
        clicked: 0,
        bounced: stats.bounced,
        unsubscribed: 0,
        open_rate: "0%",
        click_rate: "0%",
      },
    };
  }

  // ATOMIC RESERVATION: Reserve contacts before sending with unique slug constraint
  console.log(`🔒 Reserving ${Math.min(BATCH_SIZE, unsentContacts.length)} contacts atomically...`);
  const { reserved: reservedContacts, pendingRecordIds } = await reserveContactsForSending(
    campaign.id,
    unsentContacts,
    BATCH_SIZE
  );

  if (reservedContacts.length === 0) {
    console.log(`⚠️  No contacts could be reserved (all already reserved by another cron job)`);
    return {
      processed: 0,
      completed: false,
      finalStats: undefined,
    };
  }

  console.log(`✅ Successfully reserved ${reservedContacts.length} contacts`);

  // Send emails with proper rate limiting
  let batchesProcessed = 0;
  let rateLimitHit = false;
  let emailsProcessed = 0;
  let successCount = 0;
  let failureCount = 0;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  // Process reserved contacts in smaller batches
  for (
    let i = 0;
    i < reservedContacts.length && batchesProcessed < MAX_BATCHES_PER_RUN;
    i += BATCH_SIZE
  ) {
    if (rateLimitHit) break;

    const batch = reservedContacts.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${batchesProcessed + 1}: ${batch.length} reserved contacts`);

    // Process each reserved contact with proper rate limiting
    for (let contactIndex = 0; contactIndex < batch.length; contactIndex++) {
      if (rateLimitHit) break;

      const contact = batch[contactIndex];
      
      // CRITICAL FIX: Add explicit undefined check to satisfy TypeScript
      if (!contact) {
        console.error(`Undefined contact at batch index ${contactIndex}`);
        continue;
      }
      
      const startTime = Date.now();
      const pendingRecordId = pendingRecordIds.get(contact.id);

      try {
        // Get campaign content
        const emailContent = campaign.metadata.campaign_content?.content || "";
        const emailSubject = campaign.metadata.campaign_content?.subject || "";

        if (!emailContent || !emailSubject) {
          throw new Error("Campaign content or subject is missing");
        }

        // Personalize content
        let personalizedContent = emailContent.replace(
          /\{\{first_name\}\}/g,
          contact.metadata.first_name || "there"
        );
        let personalizedSubject = emailSubject.replace(
          /\{\{first_name\}\}/g,
          contact.metadata.first_name || "there"
        );

        // Add View in Browser link if public sharing is enabled
        if (campaign.metadata.public_sharing_enabled) {
          const viewInBrowserUrl = `${baseUrl}/public/campaigns/${campaign.id}`;
          const viewInBrowserLink = `
            <div style="text-align: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
              <a href="${viewInBrowserUrl}" 
                 style="color: #6b7280; font-size: 12px; text-decoration: underline;">
                View this email in your browser
              </a>
            </div>
          `;
          personalizedContent = viewInBrowserLink + personalizedContent;
        }

        // Add unsubscribe footer
        const unsubscribeUrl = createUnsubscribeUrl(
          contact.metadata.email,
          baseUrl,
          campaign.id
        );

        const unsubscribeFooter = `
          <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 10px 0;">
              You received this email because you subscribed to our mailing list.
            </p>
            <p style="margin: 0 0 10px 0;">
              <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from future emails.
            </p>
          </div>
        `;

        personalizedContent += unsubscribeFooter;

        // Send email
        const result = await sendEmail({
          from: `${settings.metadata.from_name} <${settings.metadata.from_email}>`,
          to: contact.metadata.email,
          subject: personalizedSubject,
          html: personalizedContent,
          reply_to: settings.metadata.reply_to_email || settings.metadata.from_email,
          campaignId: campaign.id,
          contactId: contact.id,
          headers: {
            "X-Campaign-ID": campaign.id,
            "X-Contact-ID": contact.id,
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        // Update the pending record to "sent" status
        await createCampaignSend({
          campaignId: campaign.id,
          contactId: contact.id,
          contactEmail: contact.metadata.email,
          status: "sent",
          resendMessageId: result.id,
          pendingRecordId: pendingRecordId, // Update existing pending record
        });

        successCount++;
        emailsProcessed++;

        // Calculate dynamic delay to maintain rate limit
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, MIN_DELAY_MS - elapsed);

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Log progress every 10 emails
        if (successCount % 10 === 0) {
          console.log(`  Progress: ${successCount} sent successfully, ${failureCount} failed`);
        }
      } catch (error: any) {
        failureCount++;

        // Check if it's a rate limit error
        if (
          error instanceof ResendRateLimitError ||
          error.message?.toLowerCase().includes("rate limit") ||
          error.message?.toLowerCase().includes("too many requests") ||
          error.statusCode === 429
        ) {
          const retryAfter = error.retryAfter || 3600;
          console.log(`⚠️  Rate limit hit! Pausing campaign. Retry after ${retryAfter}s`);

          // Save rate limit state
          await updateEmailCampaign(campaign.id, {
            rate_limit_hit_at: new Date().toISOString(),
            retry_after: retryAfter,
          } as any);

          rateLimitHit = true;
          break; // Stop processing this campaign
        }

        // Regular error - update pending record to "failed"
        console.error(`  ❌ Failed to send to ${contact.metadata.email}:`, error.message);

        await createCampaignSend({
          campaignId: campaign.id,
          contactId: contact.id,
          contactEmail: contact.metadata.email,
          status: "failed",
          errorMessage: error.message,
          pendingRecordId: pendingRecordId, // Update existing pending record
        });

        // Still apply rate limiting even on errors
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, MIN_DELAY_MS - elapsed);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    batchesProcessed++;

    // Update campaign progress after each batch
    const stats = await getCampaignSendStats(campaign.id);
    await updateCampaignProgress(campaign.id, {
      sent: stats.sent,
      failed: stats.failed + stats.bounced,
      total: allContacts.length,
      progress_percentage: Math.round((stats.sent / allContacts.length) * 100),
      last_batch_completed: new Date().toISOString(),
    });

    console.log(
      `Batch ${batchesProcessed} complete. Stats: ${stats.sent} sent, ${stats.pending} pending, ${stats.failed} failed, ${stats.bounced} bounced`
    );

    // Delay between batches (1 second)
    if (batchesProcessed < MAX_BATCHES_PER_RUN && !rateLimitHit) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Check if campaign is fully complete
  if (!rateLimitHit) {
    const remainingAfterRun = await filterUnsentContacts(
      campaign.id,
      allContacts.map((c) => c.id)
    );

    if (remainingAfterRun.length === 0) {
      console.log(`✅ Campaign ${campaign.id} fully completed!`);
      const stats = await getCampaignSendStats(campaign.id);
      
      return {
        processed: emailsProcessed,
        completed: true,
        finalStats: {
          sent: stats.sent,
          delivered: stats.sent,
          opened: 0,
          clicked: 0,
          bounced: stats.bounced,
          unsubscribed: 0,
          open_rate: "0%",
          click_rate: "0%",
        },
      };
    }
  }

  return {
    processed: emailsProcessed,
    completed: false,
    finalStats: undefined,
  };
}