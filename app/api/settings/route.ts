import { NextRequest, NextResponse } from "next/server";
import { getSettings, createOrUpdateSettings } from "@/lib/cosmic";
import { UpdateSettingsData } from "@/types";

export async function GET() {
  try {
    const settings = await getSettings();

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        settings: {
          metadata: {
            from_name: "",
            from_email: "",
            reply_to_email: "",
            company_name: "",
            company_address: "",
            website_url: "",
            support_email: "",
            brand_guidelines: "",
            primary_brand_color: "#3b82f6",
            secondary_brand_color: "#1e40af",
            ai_tone: "Professional",
            privacy_policy_url: "",
            terms_of_service_url: "",
            google_analytics_id: "",
            email_signature: "",
            test_emails: "",
            brand_logo: null,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: UpdateSettingsData & { brand_logo?: { url: string; imgix_url: string } | null } = await request.json();

    // Validate required fields
    if (!data.from_name || !data.from_email || !data.company_name) {
      return NextResponse.json(
        { error: "From name, from email, and company name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.from_email)) {
      return NextResponse.json(
        { error: "Please enter a valid from email address" },
        { status: 400 }
      );
    }

    if (data.reply_to_email && !emailRegex.test(data.reply_to_email)) {
      return NextResponse.json(
        { error: "Please enter a valid reply-to email address" },
        { status: 400 }
      );
    }

    if (data.support_email && !emailRegex.test(data.support_email)) {
      return NextResponse.json(
        { error: "Please enter a valid support email address" },
        { status: 400 }
      );
    }

    // Validate test emails if provided - handle both array and comma-separated string formats
    if (data.test_emails) {
      let testEmailArray: string[] = [];

      // Handle both array and string formats
      if (Array.isArray(data.test_emails)) {
        testEmailArray = data.test_emails
          .map((email) => String(email).trim())
          .filter((email) => email.length > 0);
      } else if (
        typeof data.test_emails === "string" &&
        data.test_emails.trim()
      ) {
        testEmailArray = data.test_emails
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0);
      }

      const invalidTestEmails = testEmailArray.filter(
        (email) => !emailRegex.test(email)
      );
      if (invalidTestEmails.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid test email addresses: ${invalidTestEmails.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate URL format if provided
    const urlRegex = /^https?:\/\/.+/;
    if (data.website_url && !urlRegex.test(data.website_url)) {
      return NextResponse.json(
        { error: "Website URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    if (data.privacy_policy_url && !urlRegex.test(data.privacy_policy_url)) {
      return NextResponse.json(
        { error: "Privacy policy URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    if (
      data.terms_of_service_url &&
      !urlRegex.test(data.terms_of_service_url)
    ) {
      return NextResponse.json(
        { error: "Terms of service URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    // Validate color format if provided
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (
      data.primary_brand_color &&
      !colorRegex.test(data.primary_brand_color)
    ) {
      return NextResponse.json(
        {
          error:
            "Primary brand color must be a valid hex color (e.g., #3b82f6)",
        },
        { status: 400 }
      );
    }

    if (
      data.secondary_brand_color &&
      !colorRegex.test(data.secondary_brand_color)
    ) {
      return NextResponse.json(
        {
          error:
            "Secondary brand color must be a valid hex color (e.g., #1e40af)",
        },
        { status: 400 }
      );
    }

    // Create or update settings - pass data directly
    // The createOrUpdateSettings function will handle converting ai_tone to Cosmic's format
    const settings = await createOrUpdateSettings(data);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}