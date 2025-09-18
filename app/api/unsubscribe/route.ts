import { NextRequest, NextResponse } from "next/server";
import { unsubscribeContact, cosmic, getSettings } from "@/lib/cosmic";

export async function GET(request: NextRequest) {
  // Fetch settings to get support email (outside try block for scope)
  let supportEmail: string | undefined;
  try {
    const settings = await getSettings();
    supportEmail = settings?.metadata?.support_email;
  } catch (settingsError) {
    console.error("Error fetching settings:", settingsError);
    // Continue without support email if settings fetch fails
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const campaignId = searchParams.get("campaign");

    if (!email) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Unsubscribe Request</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Invalid Unsubscribe Request</h1>
              <p>The unsubscribe link is missing required information. Please contact support if you continue to receive unwanted emails.</p>
              ${
                supportEmail
                  ? `<p><strong>Support:</strong> <a href="mailto:${supportEmail}" style="color: #dc2626;">${supportEmail}</a></p>`
                  : "<p><strong>Support:</strong> Please check your original email for contact information.</p>"
              }
            </div>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: { "Content-Type": "text/html" },
        }
      );
    }

    // Attempt to unsubscribe the contact
    const success = await unsubscribeContact(
      decodeURIComponent(email),
      campaignId
    );

    // Update campaign stats if unsubscribe was successful and campaignId is provided
    if (success && campaignId) {
      try {
        // Get the current campaign to update unsubscribe stats
        const { object: campaign } = await cosmic.objects
          .findOne({
            type: "marketing-campaigns",
            id: campaignId,
          })
          .props(["id", "metadata"]);

        if (campaign?.metadata?.stats) {
          const currentStats = campaign.metadata.stats;
          const newUnsubscribedCount = (currentStats.unsubscribed || 0) + 1;
          const totalSent = currentStats.sent || 1;
          const newUnsubscribeRate = `${Math.round(
            (newUnsubscribedCount / totalSent) * 100
          )}%`;

          // Update campaign stats with new unsubscribe data
          await cosmic.objects.updateOne(campaignId, {
            metadata: {
              stats: {
                ...currentStats,
                unsubscribed: newUnsubscribedCount,
                unsubscribe_rate: newUnsubscribeRate,
              },
            },
          });
        }
      } catch (statsError) {
        // Log stats update error but don't fail the unsubscribe
        console.error("Error updating unsubscribe stats:", statsError);
      }

      // Create tracking event (optional - for detailed analytics)
      try {
        await cosmic.objects.insertOne({
          type: "email-tracking-events",
          title: `Unsubscribe Event - ${new Date().toISOString()}`,
          status: "published",
          metadata: {
            event_type: "Unsubscribe",
            campaign_id: campaignId,
            email: decodeURIComponent(email),
            timestamp: new Date().toISOString(),
            user_agent: request.headers.get("user-agent") || "",
            ip_address:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              "unknown",
          },
        });
      } catch (trackingError) {
        // Log tracking error but don't fail the unsubscribe
        console.error(
          "Error creating unsubscribe tracking event:",
          trackingError
        );
      }
    }

    if (success) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Successfully Unsubscribed</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { color: #059669; background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; }
              .info { background: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>Successfully Unsubscribed</h1>
              <p>You have been successfully unsubscribed from our email list.</p>
              <p><strong>Email:</strong> ${decodeURIComponent(email)}</p>
            </div>
            <div class="info">
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>You will no longer receive marketing emails from us</li>
                <li>It may take up to 24 hours for the change to take effect</li>
                <li>You may still receive transactional emails related to your account</li>
              </ul>
              <p>If you continue to receive unwanted emails after 24 hours, please contact our support team${
                supportEmail
                  ? ` at <a href="mailto:${supportEmail}" style="color: #059669; text-decoration: underline;">${supportEmail}</a>`
                  : " for assistance"
              }.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }
      );
    } else {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Unsubscribe Error</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .warning { color: #d97706; background: #fffbeb; padding: 20px; border-radius: 8px; border: 1px solid #fed7aa; }
            </style>
          </head>
          <body>
            <div class="warning">
              <h1>Email Not Found</h1>
              <p>We couldn't find this email address in our system, or it may already be unsubscribed.</p>
              <p><strong>Email:</strong> ${decodeURIComponent(email)}</p>
              <p>If you continue to receive unwanted emails, please contact our support team${
                supportEmail
                  ? ` at <a href="mailto:${supportEmail}" style="color: #d97706; text-decoration: underline;">${supportEmail}</a>`
                  : " for assistance"
              } directly.</p>
            </div>
          </body>
        </html>
        `,
        {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  } catch (error) {
    console.error("Unsubscribe error:", error);

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribe Error</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #dc2626; background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Unsubscribe Error</h1>
            <p>An error occurred while processing your unsubscribe request. Please try again later or contact our support team${
              supportEmail
                ? ` at <a href="mailto:${supportEmail}" style="color: #dc2626; text-decoration: underline;">${supportEmail}</a>`
                : " for assistance"
            }.</p>
          </div>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests for unsubscribe (same logic as GET)
  return GET(request);
}