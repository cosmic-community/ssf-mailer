import { NextRequest, NextResponse } from "next/server";
import {
  getMarketingCampaigns,
  getEmailContacts,
  updateCampaignStatus,
  updateCampaignProgress,
  getSettings,
  getContactsByListId,
} from "@/lib/cosmic";
import { sendEmail } from "@/lib/resend";
import { createUnsubscribeUrl } from "@/lib/email-tracking";
import { MarketingCampaign, EmailContact } from "@/types";

const BATCH_SIZE = 1000; // Send 1000 emails per batch
const MAX_BATCHES_PER_RUN = 10; // Process max 10 batches per cron run (10,000 emails)

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

    console.log("Cron job started: Processing sending campaigns");

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
        console.log(
          `Processing campaign: ${campaign.metadata.name} (${campaign.id})`
        );

        const result = await processCampaignBatch(campaign, settings);
        totalProcessed += result.processed;

        // If campaign is completed, update status
        if (result.completed) {
          await updateCampaignStatus(campaign.id, "Sent", result.finalStats);
          console.log(`Campaign ${campaign.id} completed successfully`);
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
  const progress = campaign.metadata.sending_progress || {
    sent: 0,
    failed: 0,
    total: 0,
    progress_percentage: 0,
    last_batch_completed: new Date().toISOString(),
  };

  // Get all target recipients for this campaign
  let targetRecipients: EmailContact[] = [];

  // Get recipients from target lists
  if (
    campaign.metadata.target_lists &&
    campaign.metadata.target_lists.length > 0
  ) {
    for (const listRef of campaign.metadata.target_lists) {
      const listId = typeof listRef === "string" ? listRef : listRef.id;
      try {
        const listContacts = await getContactsByListId(listId);
        const activeListContacts = listContacts.filter(
          (contact) => contact.metadata.status?.value === "Active"
        );

        // Merge with existing recipients (avoid duplicates)
        for (const contact of activeListContacts) {
          if (
            !targetRecipients.find((existing) => existing.id === contact.id)
          ) {
            targetRecipients.push(contact);
          }
        }
      } catch (error) {
        console.error(`Failed to get contacts for list ${listId}:`, error);
      }
    }
  }

  // Get recipients by contact IDs
  if (
    campaign.metadata.target_contacts &&
    campaign.metadata.target_contacts.length > 0
  ) {
    const { contacts } = await getEmailContacts({ limit: 10000 });
    const targetContactIds = campaign.metadata.target_contacts.map(
      (contact: any) => (typeof contact === "string" ? contact : contact.id)
    );

    const contactRecipients = contacts.filter(
      (contact) =>
        targetContactIds.includes(contact.id) &&
        contact.metadata.status?.value === "Active" // Only send to active contacts
    );

    // Merge with existing recipients (avoid duplicates)
    for (const contact of contactRecipients) {
      if (!targetRecipients.find((existing) => existing.id === contact.id)) {
        targetRecipients.push(contact);
      }
    }
  }

  // Get recipients by tags
  if (
    campaign.metadata.target_tags &&
    campaign.metadata.target_tags.length > 0
  ) {
    const { contacts } = await getEmailContacts({ limit: 10000 });
    const tagRecipients = contacts.filter(
      (contact) =>
        contact.metadata.status?.value === "Active" && // Only send to active contacts
        contact.metadata.tags &&
        campaign.metadata.target_tags!.some((tag) =>
          contact.metadata.tags!.includes(tag)
        )
    );

    // Merge with existing recipients (avoid duplicates)
    for (const contact of tagRecipients) {
      if (!targetRecipients.find((existing) => existing.id === contact.id)) {
        targetRecipients.push(contact);
      }
    }
  }

  // Filter out already processed contacts (if this is a resumed batch)
  const totalRecipients = targetRecipients.length;
  const remainingRecipients = targetRecipients.slice(progress.sent);

  console.log(
    `Campaign ${campaign.id}: ${totalRecipients} total recipients, ${remainingRecipients.length} remaining`
  );

  if (remainingRecipients.length === 0) {
    // Campaign is complete
    const finalStats = {
      sent: progress.sent,
      delivered: progress.sent, // Assume delivered for now (could be enhanced with webhooks)
      opened: 0,
      clicked: 0,
      bounced: progress.failed,
      unsubscribed: 0,
      open_rate: "0%", // Could be calculated later with tracking
      click_rate: "0%",
    };

    return {
      processed: 0,
      completed: true,
      finalStats,
    };
  }

  // Process batches (max MAX_BATCHES_PER_RUN per cron run)
  let batchesProcessed = 0;
  let emailsProcessed = 0;
  let emailsFailed = 0;

  while (
    batchesProcessed < MAX_BATCHES_PER_RUN &&
    remainingRecipients.length > emailsProcessed
  ) {
    const batchStart = emailsProcessed;
    const batchEnd = Math.min(
      batchStart + BATCH_SIZE,
      remainingRecipients.length
    );
    const batch = remainingRecipients.slice(batchStart, batchEnd);

    console.log(
      `Processing batch ${batchesProcessed + 1}: ${batch.length} emails`
    );

    // Send emails in this batch
    for (const contact of batch) {
      try {
        await sendCampaignEmail(campaign, contact, settings);
        emailsProcessed++;
      } catch (error) {
        console.error(
          `Failed to send email to ${contact.metadata.email}:`,
          error
        );
        emailsFailed++;
      }
    }

    batchesProcessed++;

    // Update progress after each batch
    const newProgress = {
      sent: progress.sent + emailsProcessed,
      failed: progress.failed + emailsFailed,
      total: totalRecipients,
      progress_percentage: Math.round(
        ((progress.sent + emailsProcessed) / totalRecipients) * 100
      ),
      last_batch_completed: new Date().toISOString(),
    };

    await updateCampaignProgress(campaign.id, newProgress);

    console.log(
      `Batch completed. Progress: ${newProgress.sent}/${newProgress.total} (${newProgress.progress_percentage}%)`
    );
  }

  // Check if campaign is complete
  const isComplete = progress.sent + emailsProcessed >= totalRecipients;

  let finalStats;
  if (isComplete) {
    finalStats = {
      sent: progress.sent + emailsProcessed,
      delivered: progress.sent + emailsProcessed, // Assume delivered for now
      opened: 0,
      clicked: 0,
      bounced: progress.failed + emailsFailed,
      unsubscribed: 0,
      open_rate: "0%",
      click_rate: "0%",
    };
  }

  return {
    processed: emailsProcessed,
    completed: isComplete,
    finalStats,
  };
}

async function sendCampaignEmail(
  campaign: MarketingCampaign,
  contact: EmailContact,
  settings: any
) {
  // Get campaign content (decoupled from templates)
  let subject: string;
  let content: string;

  if (campaign.metadata.campaign_content) {
    subject = campaign.metadata.campaign_content.subject;
    content = campaign.metadata.campaign_content.content;
  } else {
    // Fallback to deprecated fields for very old campaigns
    subject = campaign.metadata.subject || "";
    content = campaign.metadata.content || "";

    if (!subject || !content) {
      throw new Error("No campaign content available for sending");
    }
  }

  // Replace template variables
  const personalizedSubject = subject.replace(
    /\{\{first_name\}\}/g,
    contact.metadata.first_name || "there"
  );
  const personalizedContent = content.replace(
    /\{\{first_name\}\}/g,
    contact.metadata.first_name || "there"
  );

  // Get base URL for unsubscribe
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Add unsubscribe footer
  const unsubscribeUrl = createUnsubscribeUrl(contact.metadata.email, baseUrl);

  const finalContent =
    personalizedContent +
    `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #666;">
      <p>
        You're receiving this email because you subscribed to our mailing list. 
        <br>
        <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  `;

  // Send email via Resend - tracking will be applied in lib/resend.ts
  await sendEmail({
    to: [contact.metadata.email],
    subject: personalizedSubject,
    html: finalContent,
    from: `${settings.metadata.from_name} <${settings.metadata.from_email}>`,
    reply_to: settings.metadata.reply_to_email || settings.metadata.from_email,
    campaignId: campaign.id, // This enables click tracking in sendEmail function
    contactId: contact.id,
    headers: {
      "X-Campaign-ID": campaign.id,
      "X-Contact-ID": contact.id,
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  console.log(`Email sent successfully to ${contact.metadata.email}`);
}
