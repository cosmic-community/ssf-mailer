import { Resend } from "resend";

// Don't check environment variable at import time to avoid build errors
// Instead, check it when functions are called
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
  // Check for API key at runtime, not import time
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!resend) {
    throw new Error("Resend client not initialized - RESEND_API_KEY is required");
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    // Apply click tracking if this is a campaign email
    let finalHtmlContent = options.html;
    
    // CRITICAL FIX: Validate that all required values are defined before adding tracking
    // AND extract them to local const variables to ensure TypeScript type narrowing
    if (options.html && options.campaignId && options.contactId) {
      // Extract values to local const variables INSIDE the conditional
      // TypeScript now knows these are definitely strings (not string | undefined)
      const htmlContent = options.html;
      const campaignId = options.campaignId;
      const contactId = options.contactId;
      
      // Now we can safely pass these guaranteed-string values to addTrackingToEmail
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
      // Check if this is a rate limit error (429 or rate limit message)
      const errorMessage = result.error.message || "";
      const isRateLimit = 
        errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.toLowerCase().includes("too many requests") ||
        errorMessage.includes("429");

      if (isRateLimit) {
        // Try to extract retry-after from error message if available
        const retryMatch = errorMessage.match(/retry after (\d+)/i);
        const retryAfter = retryMatch ? parseInt(retryMatch[1] ?? "3600") : 3600;
        
        console.error("Resend rate limit error:", errorMessage);
        throw new ResendRateLimitError("Resend API rate limit exceeded", retryAfter);
      }
      
      throw new Error(result.error.message || "Failed to send email");
    }

    if (!result.data?.id) {
      throw new Error("Invalid response from Resend API");
    }

    return { id: result.data.id };
  } catch (error: any) {
    // Re-throw ResendRateLimitError as-is
    if (error instanceof ResendRateLimitError) {
      throw error;
    }
    
    // Check for rate limit in generic errors (catch-all for any 429 responses)
    const errorMessage = error.message || "";
    const isRateLimit = 
      errorMessage.toLowerCase().includes("rate limit") ||
      errorMessage.toLowerCase().includes("too many requests") ||
      error.statusCode === 429 ||
      error.status === 429;

    if (isRateLimit) {
      // Try to extract retry-after from headers if available
      const retryAfter = error.headers?.['retry-after'] 
        ? parseInt(error.headers['retry-after']) 
        : 3600;
      
      console.error("Resend rate limit error (caught):", errorMessage);
      throw new ResendRateLimitError("Resend API rate limit exceeded", retryAfter);
    }
    
    console.error("Resend API error:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }
}