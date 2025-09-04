export function addTrackingToEmail(
  htmlContent: string,
  campaignId: string,
  contactId: string,
  baseUrl: string
): string {
  let trackedContent = htmlContent

  // Track all links in the email with improved URL encoding (click tracking only)
  trackedContent = trackedContent.replace(
    /href\s*=\s*["']([^"']+)["']/g,
    (match, url) => {
      // Skip mailto links, tel links, anchors, and unsubscribe links
      if (
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#') ||
        url.includes('/unsubscribe') ||
        url.includes('/api/unsubscribe') ||
        url.startsWith('javascript:') ||
        url.startsWith('data:')
      ) {
        return match
      }

      // Create click tracking URL with timestamp for uniqueness
      const encodedUrl = encodeURIComponent(url)
      const trackingUrl = `${baseUrl}/api/track/click?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(contactId)}&url=${encodedUrl}&t=${Date.now()}`
      return `href="${trackingUrl}"`
    }
  )

  return trackedContent
}

export function extractTextFromHtml(html: string): string {
  // Simple HTML to text conversion for email clients that don't support HTML
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createUnsubscribeUrl(email: string, baseUrl: string): string {
  const encodedEmail = encodeURIComponent(email)
  return `${baseUrl}/api/unsubscribe?email=${encodedEmail}`
}