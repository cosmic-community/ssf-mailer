/**
 * HTML Formatting Utilities
 * Simple, minimal HTML editing functions that preserve AI-generated content
 */

export interface FormatOptions {
  url?: string;
  text?: string;
  alt?: string;
}

/**
 * Apply formatting to selected text or insert content at cursor position
 */
export function applyFormat(
  contentElement: HTMLElement,
  format: string,
  value?: string,
  primaryColor?: string
): string {
  const selection = window.getSelection();
  if (!selection || !contentElement.contains(selection.anchorNode)) {
    return contentElement.innerHTML;
  }

  let range: Range;
  if (selection.rangeCount > 0) {
    range = selection.getRangeAt(0);
  } else {
    // Create a range at the end of content if no selection
    range = document.createRange();
    range.selectNodeContents(contentElement);
    range.collapse(false);
  }

  try {
    switch (format) {
      case "bold":
        applyInlineFormat(range, "strong");
        break;
      case "italic":
        applyInlineFormat(range, "em");
        break;
      case "heading":
        applyBlockFormat(range, value || "h2");
        break;
      case "link":
        if (value) {
          const linkData = JSON.parse(value);
          const linkColor = linkData.color || primaryColor;
          applyLinkFormat(range, linkData.url, linkData.text, linkColor);
        }
        break;
      case "image":
        if (value) {
          const imageData = JSON.parse(value);
          insertImage(range, imageData.url, imageData.alt, imageData.link);
        }
        break;
      case "align":
        if (value) {
          applyAlignment(range, value);
        }
        break;
      case "font-size":
        if (value) {
          applyFontSize(range, value);
        }
        break;
      case "font-family":
        if (value) {
          applyFontFamily(range, value);
        }
        break;
    }
    
    // CRITICAL: Trigger mutation event to notify parent components
    const mutationEvent = new CustomEvent('contentChanged', {
      detail: { content: contentElement.innerHTML }
    });
    contentElement.dispatchEvent(mutationEvent);
    
  } catch (error) {
    console.warn("Format application failed:", error);
  }

  // Don't clear selection for better UX - let the parent handle focus
  // selection.removeAllRanges();

  return contentElement.innerHTML;
}

/**
 * Apply inline formatting (bold, italic) to selected text
 */
function applyInlineFormat(range: Range, tagName: string) {
  if (range.collapsed) {
    // No selection - insert placeholder text with formatting
    const element = document.createElement(tagName);
    element.textContent = tagName === "strong" ? "Bold text" : "Italic text";
    range.insertNode(element);

    // Select the inserted text for easy editing
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }

  const selectedText = range.toString();
  if (!selectedText.trim()) return;

  // Check if the selection is within or spans formatted elements
  const isFormatted = isSelectionFormatted(range, tagName);

  if (isFormatted) {
    // Remove formatting - unwrap the formatted elements
    removeInlineFormatting(range, tagName);
  } else {
    // Apply formatting - wrap selection in new element
    const element = document.createElement(tagName);
    try {
      const contents = range.extractContents();
      element.appendChild(contents);
      range.insertNode(element);
    } catch (error) {
      // Fallback: create text node if extraction fails
      element.textContent = selectedText;
      range.deleteContents();
      range.insertNode(element);
    }
  }
}

/**
 * Check if selection is already formatted with the given tag
 */
function isSelectionFormatted(range: Range, tagName: string): boolean {
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (
          (node as Element).tagName?.toLowerCase() === tagName.toLowerCase()
        ) {
          // Check if this formatted element intersects with our range
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);

          // Check if ranges intersect
          return range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >
            0 && range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_SKIP;
      },
    }
  );

  return walker.nextNode() !== null;
}

/**
 * Remove inline formatting from selection
 */
function removeInlineFormatting(range: Range, tagName: string) {
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  // Find all formatted elements that intersect with the selection
  const elementsToUnwrap: Element[] = [];

  // Walk through the range and collect formatted elements
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (
          (node as Element).tagName?.toLowerCase() === tagName.toLowerCase()
        ) {
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(node);

          // Check if this element intersects with our selection
          if (
            range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0 &&
            range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0
          ) {
            elementsToUnwrap.push(node as Element);
          }
        }
        return NodeFilter.FILTER_SKIP;
      },
    }
  );

  let node;
  while ((node = walker.nextNode())) {
    // Already collected in acceptNode
  }

  // Unwrap the elements
  elementsToUnwrap.forEach((element) => {
    const parent = element.parentNode;
    if (parent) {
      // Move all child nodes out of the formatted element
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      // Remove the now-empty formatted element
      parent.removeChild(element);
    }
  });
}

/**
 * Apply block formatting (headings, paragraphs) to selected text
 */
function applyBlockFormat(range: Range, tagName: string) {
  // Find the closest block element containing the selection
  let blockElement: Node | null = range.commonAncestorContainer;
  while (blockElement && blockElement.nodeType !== Node.ELEMENT_NODE) {
    blockElement = blockElement.parentNode;
  }

  // Find the actual block element (p, h1, h2, etc.)
  while (blockElement && !isBlockElement(blockElement as Element)) {
    blockElement = blockElement.parentNode;
  }

  if (!blockElement) {
    // If no block element found, wrap selection in new block
    const newElement = document.createElement(tagName);
    applyHeadingStyles(newElement, tagName);
    if (range.collapsed) {
      newElement.textContent = getPlaceholderText(tagName);
    } else {
      const contents = range.extractContents();
      newElement.appendChild(contents);
    }
    range.insertNode(newElement);
  } else {
    const currentElement = blockElement as Element;
    const currentTag = currentElement.tagName.toLowerCase();

    // Check if we're toggling the same heading type
    if (currentTag === tagName.toLowerCase()) {
      // Toggle off - convert to paragraph
      const newElement = document.createElement("p");
      applyHeadingStyles(newElement, "p");
      newElement.innerHTML = currentElement.innerHTML;
      currentElement.parentNode?.replaceChild(newElement, currentElement);
    } else {
      // Apply new formatting
      const newElement = document.createElement(tagName);
      applyHeadingStyles(newElement, tagName);
      newElement.innerHTML = currentElement.innerHTML;
      currentElement.parentNode?.replaceChild(newElement, currentElement);
    }
  }
}

/**
 * Apply inline styles to heading elements
 */
function applyHeadingStyles(element: HTMLElement, tagName: string) {
  switch (tagName.toLowerCase()) {
    case "h1":
      element.style.fontSize = "28px";
      element.style.fontWeight = "600";
      element.style.color = "#1d1d1f";
      element.style.margin = "0 0 20px 0";
      element.style.letterSpacing = "-0.5px";
      element.style.lineHeight = "1.2";
      break;
    case "h2":
      element.style.fontSize = "22px";
      element.style.fontWeight = "600";
      element.style.color = "#1d1d1f";
      element.style.margin = "0 0 16px 0";
      element.style.letterSpacing = "-0.3px";
      element.style.lineHeight = "1.3";
      break;
    case "h3":
      element.style.fontSize = "18px";
      element.style.fontWeight = "600";
      element.style.color = "#1d1d1f";
      element.style.margin = "0 0 12px 0";
      element.style.letterSpacing = "-0.2px";
      element.style.lineHeight = "1.4";
      break;
    case "p":
    default:
      element.style.fontSize = "16px";
      element.style.fontWeight = "400";
      element.style.color = "#1d1d1f";
      element.style.margin = "0 0 16px 0";
      element.style.lineHeight = "1.6";
      break;
  }
}

/**
 * Apply link formatting to selected text or insert new link
 * CRITICAL: This function now properly saves link data and triggers content updates
 */
function applyLinkFormat(
  range: Range,
  url: string,
  text: string,
  primaryColor?: string
) {
  const link = document.createElement("a");
  // Set href directly without HTML encoding to preserve query parameters
  link.href = url;
  link.textContent = text;

  // Apply default color for new links, but don't override existing styles
  if (primaryColor && !link.style.color) {
    link.style.color = primaryColor;
  }

  // Add click handler to prevent default navigation and allow editing
  link.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Dispatch custom event for link editing
    const editEvent = new CustomEvent("editLink", {
      detail: { element: link, url: link.href, text: link.textContent },
    });
    document.dispatchEvent(editEvent);
  });

  // Add external link attributes for external URLs
  if (!url.startsWith("/") && !url.includes(window.location.hostname)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  if (range.collapsed) {
    // Insert new link
    range.insertNode(link);
  } else {
    // Replace selected text with link
    range.deleteContents();
    range.insertNode(link);
  }

  // CRITICAL: Force content update after link insertion
  const parentElement = link.closest('[contenteditable="true"]') as HTMLElement;
  if (parentElement) {
    const contentChangeEvent = new CustomEvent('contentChanged', {
      detail: { content: parentElement.innerHTML }
    });
    parentElement.dispatchEvent(contentChangeEvent);
  }
}

/**
 * Insert image at cursor position
 * CRITICAL: This function now properly saves image data and triggers content updates
 */
function insertImage(range: Range, url: string, alt: string, link?: string) {
  const img = document.createElement("img");
  img.src = url;
  img.alt = alt;
  img.style.maxWidth = "100%";
  img.style.height = "auto";
  img.style.display = "block";
  img.style.margin = "16px auto";
  img.style.cursor = "pointer";
  img.style.border = "2px solid transparent";
  img.style.borderRadius = "4px";

  // Add hover effect
  img.addEventListener("mouseenter", () => {
    img.style.border = "2px solid #3b82f6";
  });

  img.addEventListener("mouseleave", () => {
    img.style.border = "2px solid transparent";
  });

  // Add click handler to allow editing
  img.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Dispatch custom event for image editing
    const editEvent = new CustomEvent("editImage", {
      detail: { element: img, url: img.src, alt: img.alt },
    });
    document.dispatchEvent(editEvent);
  });

  // If there's a selection, replace it
  if (!range.collapsed) {
    range.deleteContents();
  }

  // Wrap in link if provided
  if (link && link.trim()) {
    const linkElement = document.createElement("a");
    // Set href directly without HTML encoding to preserve query parameters
    linkElement.href = link.trim();

    // Add external link attributes for external URLs
    if (
      !link.trim().startsWith("/") &&
      !link.trim().includes(window.location.hostname)
    ) {
      linkElement.target = "_blank";
      linkElement.rel = "noopener noreferrer";
    }

    linkElement.appendChild(img);
    range.insertNode(linkElement);
    
    // CRITICAL: Force content update after image with link insertion
    const parentElement = linkElement.closest('[contenteditable="true"]') as HTMLElement;
    if (parentElement) {
      const contentChangeEvent = new CustomEvent('contentChanged', {
        detail: { content: parentElement.innerHTML }
      });
      parentElement.dispatchEvent(contentChangeEvent);
    }
  } else {
    range.insertNode(img);
    
    // CRITICAL: Force content update after image insertion
    const parentElement = img.closest('[contenteditable="true"]') as HTMLElement;
    if (parentElement) {
      const contentChangeEvent = new CustomEvent('contentChanged', {
        detail: { content: parentElement.innerHTML }
      });
      parentElement.dispatchEvent(contentChangeEvent);
    }
  }

  // Add some space after the image
  const br = document.createElement("br");
  range.collapse(false);
  range.insertNode(br);
}

/**
 * Apply text alignment to selected content
 */
function applyAlignment(range: Range, alignment: string) {
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  // Find the block element containing the selection
  let blockElement =
    startContainer.nodeType === Node.TEXT_NODE
      ? startContainer.parentElement
      : (startContainer as Element);

  // Traverse up to find a block-level element
  while (
    blockElement &&
    !isBlockElement(blockElement) &&
    blockElement.parentElement
  ) {
    blockElement = blockElement.parentElement;
  }

  if (blockElement) {
    // Apply text-align style
    (blockElement as HTMLElement).style.textAlign = alignment;
  }
}

/**
 * Apply font size to selected text
 */
function applyFontSize(range: Range, size: string) {
  if (range.collapsed) {
    // If no selection, create a span at cursor position for future typing
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.innerHTML = "&#8203;"; // Zero-width space to make it selectable

    try {
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);

      // Set cursor position after the span
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn("Failed to apply font size:", error);
    }
  } else {
    // If there's a selection, check if it's already wrapped in a font-size span
    const selectedContent = range.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(selectedContent);

    // Check if the selection is entirely within a span with font-size
    const parentSpan =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element);

    if (
      parentSpan &&
      parentSpan.tagName === "SPAN" &&
      (parentSpan as HTMLElement).style.fontSize
    ) {
      // Update existing span
      (parentSpan as HTMLElement).style.fontSize = `${size}px`;
    } else {
      // Create new span with font-size
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;

      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);

        // Select the new span content
        range.selectNodeContents(span);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.warn("Failed to apply font size:", error);
      }
    }
  }
}

/**
 * Apply font family to selected text
 */
function applyFontFamily(range: Range, fontFamily: string) {
  if (range.collapsed) {
    // If no selection, create a span at cursor position for future typing
    const span = document.createElement("span");
    span.style.fontFamily = fontFamily;
    span.innerHTML = "&#8203;"; // Zero-width space to make it selectable

    try {
      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);

      // Set cursor position after the span
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      console.warn("Failed to apply font family:", error);
    }
  } else {
    // If there's a selection, check if it's already wrapped in a span with font-family
    const selectedContent = range.cloneContents();
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(selectedContent);

    // Check if the selection is entirely within a span with font-family
    const parentSpan =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element);

    if (
      parentSpan &&
      parentSpan.tagName === "SPAN" &&
      (parentSpan as HTMLElement).style.fontFamily
    ) {
      // Update existing span
      (parentSpan as HTMLElement).style.fontFamily = fontFamily;
    } else {
      // Create new span with font-family
      const span = document.createElement("span");
      span.style.fontFamily = fontFamily;

      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);

        // Select the new span content
        range.selectNodeContents(span);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (error) {
        console.warn("Failed to apply font family:", error);
      }
    }
  }
}

/**
 * Check if an element is a block-level element
 */
function isBlockElement(element: Element): boolean {
  const blockTags = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "div",
    "section",
    "article",
  ];
  return blockTags.includes(element.tagName.toLowerCase());
}

/**
 * Get placeholder text for different heading levels
 */
function getPlaceholderText(tagName: string): string {
  switch (tagName.toLowerCase()) {
    case "h1":
      return "Main Heading";
    case "h2":
      return "Section Heading";
    case "h3":
      return "Subsection Heading";
    case "p":
    default:
      return "Your text here";
  }
}

/**
 * Apply click handlers to existing links and images
 * CRITICAL: Now also ensures content change events are properly fired
 */
function applyInteractiveHandlers(
  container: HTMLElement,
  primaryColor?: string
) {
  // Handle existing links
  const links = container.querySelectorAll("a");
  links.forEach((link) => {
    // Remove existing event listeners to avoid duplicates
    const newLink = link.cloneNode(true) as HTMLAnchorElement;

    // Don't force color on existing links - preserve AI-generated styles

    // Add click handler
    newLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const editEvent = new CustomEvent("editLink", {
        detail: {
          element: newLink,
          url: newLink.href,
          text: newLink.textContent,
        },
      });
      document.dispatchEvent(editEvent);
    });

    link.parentNode?.replaceChild(newLink, link);
  });

  // Handle existing images
  const images = container.querySelectorAll("img");
  images.forEach((img) => {
    // Remove existing event listeners to avoid duplicates
    const newImg = img.cloneNode(true) as HTMLImageElement;

    // Apply image styling
    newImg.style.maxWidth = "100%";
    newImg.style.height = "auto";
    newImg.style.display = "block";
    newImg.style.margin = "16px auto";
    newImg.style.cursor = "pointer";
    newImg.style.border = "2px solid transparent";
    newImg.style.borderRadius = "4px";

    // Add hover effects
    newImg.addEventListener("mouseenter", () => {
      newImg.style.border = "2px solid #3b82f6";
    });

    newImg.addEventListener("mouseleave", () => {
      newImg.style.border = "2px solid transparent";
    });

    // Add click handler
    newImg.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const editEvent = new CustomEvent("editImage", {
        detail: { element: newImg, url: newImg.src, alt: newImg.alt },
      });
      document.dispatchEvent(editEvent);
    });

    img.parentNode?.replaceChild(newImg, img);
  });
}

/**
 * Apply styles to all heading and paragraph elements in a container
 */
export function applyStylesToContent(
  container: HTMLElement,
  primaryColor?: string
) {
  const headings = container.querySelectorAll("h1, h2, h3, p");
  headings.forEach((element) => {
    applyHeadingStyles(element as HTMLElement, element.tagName);
  });

  // Also apply interactive handlers to links and images
  applyInteractiveHandlers(container, primaryColor);
}

/**
 * Clean up HTML content by removing empty elements and normalizing structure
 * CRITICAL: Preserve URL query parameters by avoiding HTML entity encoding
 */
export function cleanupHtml(html: string, primaryColor?: string): string {
  // Create a temporary div to work with the HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remove empty elements (except img and br)
  const emptyElements = temp.querySelectorAll(
    "*:empty:not(img):not(br):not(hr)"
  );
  emptyElements.forEach((el) => el.remove());

  // Apply styles to all headings and paragraphs
  applyStylesToContent(temp, primaryColor);

  // Fix any HTML entity encoding in href attributes that may have occurred
  const links = temp.querySelectorAll("a[href]");
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href && href.includes("&amp;")) {
      // Decode HTML entities in href attributes to preserve query parameters
      link.setAttribute("href", href.replace(/&amp;/g, "&"));
    }
  });

  // Normalize whitespace in text nodes only
  const textNodes = document.createTreeWalker(temp, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = textNodes.nextNode())) {
    if (node.textContent) {
      node.textContent = node.textContent.replace(/\s+/g, " ");
    }
  }

  return temp.innerHTML;
}