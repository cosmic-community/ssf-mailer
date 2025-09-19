import { Resend } from "resend";
import {
  EmailTemplate,
  Settings,
  EmailContact,
  MarketingCampaign,
} from "@/types";
import { updateCampaignProgress } from "./cosmic";
import { addTrackingToEmail, createUnsubscribeUrl } from "./email-tracking";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// Type definitions for Resend API responses based on actual Resend library types
export interface SendEmailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  headers?: Record<string, string>;
  campaignId?: string;
  contactId?: string;
}

// The Resend library returns a Promise that resolves to either success data or throws an error
export interface ResendSuccessResponse {
  id: string;
}

export interface ResendErrorResponse {
  message: string;
  name: string;
}

// Rate limiting configuration for Resend API
const RATE_LIMIT = {
  BATCH_SIZE: 1000, // Send 1000 emails per batch
  BATCH_DELAY: 1000, // Wait 1 second between batches (optimized for higher throughput)
  RETRY_ATTEMPTS: 3, // Retry failed emails up to 3 times
  RETRY_DELAY: 5000, // Wait 5 seconds before retry
};

// Export the sendEmail function that wraps the Resend SDK
export async function sendEmail(
  options: SendEmailOptions
): Promise<ResendSuccessResponse> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    // Apply click tracking if this is a campaign email
    let finalHtmlContent = options.html;
    if (options.html && options.campaignId && options.contactId) {
      finalHtmlContent = addTrackingToEmail(
        options.html,
        options.campaignId,
        options.contactId,
        baseUrl
      );
    }

    // Ensure text field is always a string (required by Resend API)
    const textContent =
      options.text ||
      (finalHtmlContent
        ? finalHtmlContent.replace(/<[^>]*>/g, "")
        : options.subject);

    const result = await resend.emails.send({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: finalHtmlContent,
      text: textContent, // Now guaranteed to be a string
      reply_to: options.reply_to,
      headers: options.headers,
    });

    // The Resend SDK returns { data: { id: string }, error: null } on success
    // or { data: null, error: ErrorObject } on failure
    if (result.error) {
      throw new Error(result.error.message || "Failed to send email");
    }

    if (!result.data?.id) {
      throw new Error("Invalid response from Resend API");
    }

    return { id: result.data.id };
  } catch (error: any) {
    console.error("Resend API error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }
}

// Sleep utility for delays
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to add View in Browser link to email content
function addViewInBrowserLink(
  content: string,
  campaignId: string,
  baseUrl: string
): string {
  const viewInBrowserUrl = `${baseUrl}/public/campaigns/${campaignId}`;
  const viewInBrowserLink = `
    <div style="text-align: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
      <a href="${viewInBrowserUrl}" 
         style="color: #6b7280; font-size: 12px; text-decoration: underline;">
        View this email in your browser
      </a>
    </div>
  `;
  
  return viewInBrowserLink + content;
}

// Batch processing function with rate limiting and retry logic
export async function sendCampaignEmails(
  campaignId: string,
  campaign: MarketingCampaign,
  contacts: EmailContact[],
  settings: Settings
): Promise<{ success: boolean; sent_count: number; error?: string }> {
  try {
    if (!contacts || contacts.length === 0) {
      return { success: false, sent_count: 0, error: "No contacts to send to" };
    }

    // Filter active contacts only
    const activeContacts = contacts.filter(
      (contact) => contact.metadata.status?.value === "Active"
    );

    if (activeContacts.length === 0) {
      return {
        success: false,
        sent_count: 0,
        error: "No active contacts to send to",
      };
    }

    // Get campaign content (decoupled from templates)
    let emailContent: string;
    let emailSubject: string;

    if (campaign.metadata.campaign_content) {
      emailContent = campaign.metadata.campaign_content.content;
      emailSubject = campaign.metadata.campaign_content.subject;
    } else {
      // Fallback to deprecated fields for very old campaigns
      emailContent = campaign.metadata.content || "";
      emailSubject = campaign.metadata.subject || "";
    }

    if (!emailContent || !emailSubject) {
      return {
        success: false,
        sent_count: 0,
        error: "Campaign content or subject is missing",
      };
    }

    const fromEmail = `${settings.metadata.from_name} <${settings.metadata.from_email}>`;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    let totalSent = 0;
    let totalFailed = 0;
    const totalContacts = activeContacts.length;

    console.log(`Starting batch email sending for campaign ${campaignId}`);
    console.log(`Total contacts to process: ${totalContacts}`);
    console.log(
      `Batch size: ${RATE_LIMIT.BATCH_SIZE}, Delay between batches: ${RATE_LIMIT.BATCH_DELAY}ms`
    );

    // Process contacts in batches to respect rate limits
    for (let i = 0; i < activeContacts.length; i += RATE_LIMIT.BATCH_SIZE) {
      const batch = activeContacts.slice(i, i + RATE_LIMIT.BATCH_SIZE);
      const batchNumber = Math.floor(i / RATE_LIMIT.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(
        activeContacts.length / RATE_LIMIT.BATCH_SIZE
      );

      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} emails)`
      );

      // Process each email in the current batch
      const batchPromises = batch.map(async (contact) => {
        let attempts = 0;
        let lastError: any = null;

        while (attempts < RATE_LIMIT.RETRY_ATTEMPTS) {
          try {
            // Personalize content
            let personalizedContent = emailContent;
            let personalizedSubject = emailSubject;

            // Replace template variables
            personalizedContent = personalizedContent.replace(
              /\{\{first_name\}\}/g,
              contact.metadata.first_name || "there"
            );
            personalizedContent = personalizedContent.replace(
              /\{\{last_name\}\}/g,
              contact.metadata.last_name || ""
            );
            personalizedSubject = personalizedSubject.replace(
              /\{\{first_name\}\}/g,
              contact.metadata.first_name || "there"
            );
            personalizedSubject = personalizedSubject.replace(
              /\{\{last_name\}\}/g,
              contact.metadata.last_name || ""
            );

            // Add View in Browser link if public sharing is enabled
            if (campaign.metadata.public_sharing_enabled) {
              personalizedContent = addViewInBrowserLink(
                personalizedContent,
                campaignId,
                baseUrl
              );
            }

            // Add unsubscribe link and footer
            const unsubscribeUrl = createUnsubscribeUrl(
              contact.metadata.email,
              baseUrl,
              campaignId
            );
            const companyAddress = settings.metadata.company_address || "";

            const unsubscribeFooter = `
              <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
                <p style="margin: 0 0 10px 0;">
                  You received this email because you subscribed to our mailing list.
                </p>
                <p style="margin: 0 0 10px 0;">
                  <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a> from future emails.
                </p>
                ${
                  companyAddress
                    ? `<p style="margin: 0; font-size: 11px;">${companyAddress.replace(
                        /\n/g,
                        "<br>"
                      )}</p>`
                    : ""
                }
              </div>
            `;

            personalizedContent += unsubscribeFooter;

            await sendEmail({
              from: fromEmail,
              to: contact.metadata.email,
              subject: personalizedSubject,
              html: personalizedContent,
              reply_to:
                settings.metadata.reply_to_email ||
                settings.metadata.from_email,
              campaignId: campaignId, // Pass campaign ID for tracking
              contactId: contact.id, // Pass contact ID for tracking
              headers: {
                "X-Campaign-ID": campaignId,
                "X-Contact-ID": contact.id,
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            });

            console.log(
              `✓ Sent email to ${contact.metadata.email} (attempt ${
                attempts + 1
              })`
            );
            return { success: true, email: contact.metadata.email };
          } catch (error: any) {
            attempts++;
            lastError = error;
            console.error(
              `✗ Failed to send email to ${contact.metadata.email} (attempt ${attempts}/${RATE_LIMIT.RETRY_ATTEMPTS}):`,
              error.message
            );

            if (attempts < RATE_LIMIT.RETRY_ATTEMPTS) {
              // Wait before retry with exponential backoff
              const retryDelay =
                RATE_LIMIT.RETRY_DELAY * Math.pow(2, attempts - 1);
              console.log(`Retrying in ${retryDelay}ms...`);
              await sleep(retryDelay);
            }
          }
        }

        return {
          success: false,
          email: contact.metadata.email,
          error: lastError?.message,
        };
      });

      // Wait for all emails in the batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Count successes and failures in this batch
      let batchSent = 0;
      let batchFailed = 0;

      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value.success) {
          batchSent++;
        } else {
          batchFailed++;
        }
      });

      totalSent += batchSent;
      totalFailed += batchFailed;

      console.log(
        `Batch ${batchNumber} completed: ${batchSent} sent, ${batchFailed} failed`
      );
      console.log(
        `Campaign progress: ${totalSent}/${totalContacts} sent (${Math.round(
          (totalSent / totalContacts) * 100
        )}%)`
      );

      // Update campaign progress in database
      try {
        await updateCampaignProgress(campaignId, {
          sent: totalSent,
          failed: totalFailed,
          total: totalContacts,
          progress_percentage: Math.round((totalSent / totalContacts) * 100),
          last_batch_completed: new Date().toISOString(),
        });
      } catch (progressError) {
        console.error("Failed to update campaign progress:", progressError);
        // Don't fail the entire campaign for progress update failures
      }

      // Wait between batches to respect rate limits (except for the last batch)
      if (i + RATE_LIMIT.BATCH_SIZE < activeContacts.length) {
        console.log(`Waiting ${RATE_LIMIT.BATCH_DELAY}ms before next batch...`);
        await sleep(RATE_LIMIT.BATCH_DELAY);
      }
    }

    const successRate = Math.round((totalSent / totalContacts) * 100);
    console.log(`Campaign ${campaignId} completed:`);
    console.log(`- Total contacts processed: ${totalContacts}`);
    console.log(`- Successfully sent: ${totalSent}`);
    console.log(`- Failed to send: ${totalFailed}`);
    console.log(`- Success rate: ${successRate}%`);

    return {
      success: totalSent > 0,
      sent_count: totalSent,
      error:
        totalSent === 0
          ? `No emails were sent successfully. ${totalFailed} contacts failed.`
          : undefined,
    };
  } catch (error) {
    console.error("Campaign email sending error:", error);
    return {
      success: false,
      sent_count: 0,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}