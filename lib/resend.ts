import { Resend } from "resend";

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

// Custom error class for rate limits
export class ResendRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ResendRateLimitError';
  }
}

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
    
    // FIXED: Validate that all required values are defined before adding tracking
    // Extract to local variables INSIDE the conditional to ensure type safety
    if (options.html && options.campaignId && options.contactId) {
      // CRITICAL FIX: Extract values inside the conditional block
      // This ensures TypeScript knows they are definitely strings
      const htmlContent: string = options.html;
      const campaignId: string = options.campaignId;
      const contactId: string = options.contactId;
      
      // TypeScript now knows these are definitely strings (not string | undefined)
      const { addTrackingToEmail } = await import("./email-tracking");
      finalHtmlContent = addTrackingToEmail(
        htmlContent,
        campaignId,
        contactId,
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
      // Check if this is a rate limit error
      const errorMessage = result.error.message || "";
      if (
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.toLowerCase().includes("too many requests")
      ) {
        // Try to extract retry-after from error message if available
        const retryMatch = errorMessage.match(/retry after (\d+)/i);
        const retryAfter = retryMatch ? parseInt(retryMatch[1]) : 3600; // Default 1 hour
        throw new ResendRateLimitError("Resend API rate limit exceeded", retryAfter);
      }
      throw new Error(result.error.message || "Failed to send email");
    }

    if (!result.data?.id) {
      throw new Error("Invalid response from Resend API");
    }

    return { id: result.data.id };
  } catch (error: any) {
    // Re-throw rate limit errors as-is
    if (error instanceof ResendRateLimitError) {
      throw error;
    }
    
    // Check for rate limit in generic errors
    if (
      error.message?.toLowerCase().includes("rate limit") ||
      error.message?.toLowerCase().includes("too many requests") ||
      error.statusCode === 429
    ) {
      throw new ResendRateLimitError("Resend API rate limit exceeded", 3600);
    }
    
    console.error("Resend API error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }
}