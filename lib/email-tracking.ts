export function addTrackingToEmail(
  htmlContent: string,
  campaignId: string,
  contactId: string,
  baseUrl: string
): string {
  let trackedContent = htmlContent

  // Add tracking pixel at the end of the email body
  const trackingPixel = `<img src="${baseUrl}/api/track/open?c=${campaignId}&u=${contactId}" width="1" height="1" style="display: none;" alt="">`
  
  // Insert tracking pixel before closing body tag
  if (trackedContent.includes('</body>')) {
    trackedContent = trackedContent.replace('</body>', `${trackingPixel}</body>`)
  } else {
    // If no body tag, append at the end
    trackedContent += trackingPixel
  }

  // Track all links in the email
  trackedContent = trackedContent.replace(
    /href="([^"]+)"/g,
    (match, url) => {
      // Skip tracking pixels, mailto links, tel links, anchors, and unsubscribe links
      if (
        url.includes('/api/track/open') ||
        url.startsWith('mailto:') ||
        url.startsWith('tel:') ||
        url.startsWith('#') ||
        url.includes('/unsubscribe') ||
        url.includes('/api/unsubscribe')
      ) {
        return match
      }

      const encodedUrl = encodeURIComponent(url)
      const trackingUrl = `${baseUrl}/api/track/click?c=${campaignId}&u=${contactId}&url=${encodedUrl}`
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