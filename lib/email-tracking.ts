export function addTrackingToEmail(
  htmlContent: string,
  campaignId: string,
  contactId: string,
  baseUrl: string
): string {
  let trackedContent = htmlContent

  // Create multiple tracking pixels with different approaches for maximum compatibility
  // Some email clients block certain implementations, so we use multiple fallbacks
  
  // Method 1: Standard tracking pixel in a table (best for most email clients)
  const standardPixel = `
    <table role="presentation" style="width: 1px; height: 1px; margin: 0; padding: 0; border: 0; border-collapse: collapse; font-size: 1px; line-height: 1px;">
      <tr>
        <td style="width: 1px; height: 1px; margin: 0; padding: 0; border: 0; font-size: 1px; line-height: 1px; overflow: hidden;">
          <img src="${baseUrl}/api/track/open?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(contactId)}&t=${Date.now()}" 
               width="1" 
               height="1" 
               style="width: 1px !important; height: 1px !important; margin: 0 !important; padding: 0 !important; border: none !important; display: block !important; max-width: 1px !important; max-height: 1px !important; min-width: 1px !important; min-height: 1px !important; opacity: 0; visibility: hidden;" 
               alt="" 
               border="0"
               loading="eager">
        </td>
      </tr>
    </table>`

  // Method 2: CSS background image pixel (backup for clients that strip img tags)
  const backgroundPixel = `
    <div style="width: 1px; height: 1px; background-image: url('${baseUrl}/api/track/open?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(contactId)}&m=bg&t=${Date.now()}'); background-repeat: no-repeat; background-size: 1px 1px; overflow: hidden; font-size: 1px; line-height: 1px; opacity: 0;"></div>`

  // Method 3: Hidden div with fetch-based tracking (for modern email clients)
  const scriptPixel = `
    <div id="track-${campaignId}-${contactId}" style="display: none; width: 0; height: 0; overflow: hidden;">
      <script type="text/javascript">
        try {
          var img = new Image();
          img.src = '${baseUrl}/api/track/open?c=${encodeURIComponent(campaignId)}&u=${encodeURIComponent(contactId)}&m=js&t=' + Date.now();
        } catch(e) {}
      </script>
    </div>`

  // Insert all tracking pixels before closing body tag, or at the very end
  const allPixels = standardPixel + backgroundPixel + scriptPixel
  
  if (trackedContent.includes('</body>')) {
    trackedContent = trackedContent.replace('</body>', `${allPixels}</body>`)
  } else if (trackedContent.includes('</html>')) {
    trackedContent = trackedContent.replace('</html>', `${allPixels}</html>`)
  } else {
    // If no body or html tag, append at the end
    trackedContent += allPixels
  }

  // Track all links in the email with improved URL encoding
  trackedContent = trackedContent.replace(
    /href\s*=\s*["']([^"']+)["']/g,
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