export function addTrackingToEmail(
  htmlContent: string,
  campaignId: string,
  contactId: string,
  baseUrl: string
): string {
  let trackedContent = htmlContent

  // Create a more robust tracking pixel that works better with email clients
  // Use CSS properties that are less likely to be stripped by email clients
  // Place the pixel in a table cell for better email client compatibility
  const trackingPixel = `
    <table role="presentation" style="width: 1px; height: 1px; margin: 0; padding: 0; border: 0; border-collapse: collapse;">
      <tr>
        <td style="width: 1px; height: 1px; margin: 0; padding: 0; border: 0; line-height: 1px; font-size: 1px;">
          <img src="${baseUrl}/api/track/open?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(contactId)}" 
               width="1" 
               height="1" 
               style="width: 1px !important; height: 1px !important; margin: 0 !important; padding: 0 !important; border: none !important; display: block !important; max-width: 1px !important; max-height: 1px !important; min-width: 1px !important; min-height: 1px !important;" 
               alt="" 
               border="0">
        </td>
      </tr>
    </table>`
  
  // Insert tracking pixel before closing body tag, or at the very end if no body tag
  if (trackedContent.includes('</body>')) {
    trackedContent = trackedContent.replace('</body>', `${trackingPixel}</body>`)
  } else if (trackedContent.includes('</html>')) {
    trackedContent = trackedContent.replace('</html>', `${trackingPixel}</html>`)
  } else {
    // If no body or html tag, append at the end
    trackedContent += trackingPixel
  }

  // Track all links in the email with better URL encoding
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

      // Double-encode the URL to ensure it survives email client processing
      const encodedUrl = encodeURIComponent(url)
      const trackingUrl = `${baseUrl}/api/track/click?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(contactId)}&url=${encodedUrl}`
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