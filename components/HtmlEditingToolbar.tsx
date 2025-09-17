"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bold,
  Italic,
  Link,
  Image,
  ExternalLink,
  Palette,
  Upload,
  Type,
  Crop,
  Unlink,
} from "lucide-react";
import MediaLibrary from "@/components/MediaLibrary";
import ImageCropperModal from "@/components/ImageCropperModal";
import { MediaItem } from "@/types";

interface HtmlEditingToolbarProps {
  onFormatApply: (format: string, value?: string) => void;
  getActiveFormats?: () => {
    bold: boolean;
    italic: boolean;
    heading: string | null; // 'h1', 'h2', 'h3', or null
  };
  className?: string;
  primaryColor?: string;
}

interface LinkDialogData {
  url: string;
  text: string;
  isOpen: boolean;
  color: string;
  element?: HTMLAnchorElement; // For editing existing links
}

interface ImageDialogData {
  url: string;
  alt: string;
  link: string; // URL to link the image to
  isOpen: boolean;
  element?: HTMLImageElement; // For editing existing images
}

// Font options for email templates
const EMAIL_FONTS = [
  { value: "inherit", label: "Default", family: "inherit" },
  // Web-safe fonts
  { value: "arial", label: "Arial", family: "Arial, Helvetica, sans-serif" },
  {
    value: "helvetica",
    label: "Helvetica",
    family: "Helvetica, Arial, sans-serif",
  },
  {
    value: "times",
    label: "Times New Roman",
    family: "Times, 'Times New Roman', serif",
  },
  { value: "georgia", label: "Georgia", family: "Georgia, serif" },
  {
    value: "courier",
    label: "Courier New",
    family: "'Courier New', Courier, monospace",
  },
  { value: "verdana", label: "Verdana", family: "Verdana, Geneva, sans-serif" },
  { value: "tahoma", label: "Tahoma", family: "Tahoma, Geneva, sans-serif" },
  {
    value: "trebuchet",
    label: "Trebuchet MS",
    family: "'Trebuchet MS', Helvetica, sans-serif",
  },
  // Google Fonts (with fallbacks for email compatibility)
  {
    value: "quicksand",
    label: "Quicksand",
    family: "'Quicksand', Helvetica, Arial, sans-serif",
  },
  {
    value: "opensans",
    label: "Open Sans",
    family: "'Open Sans', Helvetica, Arial, sans-serif",
  },
  { value: "roboto", label: "Roboto", family: "'Roboto', Arial, sans-serif" },
  { value: "lato", label: "Lato", family: "'Lato', Arial, sans-serif" },
  {
    value: "montserrat",
    label: "Montserrat",
    family: "'Montserrat', Helvetica, sans-serif",
  },
  {
    value: "poppins",
    label: "Poppins",
    family: "'Poppins', Arial, sans-serif",
  },
  {
    value: "futura",
    label: "Futura",
    family: "'Futura', 'Futura PT', Helvetica, Arial, sans-serif",
  },
  {
    value: "playfair",
    label: "Playfair Display",
    family: "'Playfair Display', Georgia, serif",
  },
  {
    value: "merriweather",
    label: "Merriweather",
    family: "'Merriweather', Georgia, serif",
  },
];

// Utility function to convert RGB color to hex
function rgbToHex(rgb: string): string {
  // Extract RGB values from rgb(r, g, b) format
  const result = rgb.match(/\d+/g);
  if (!result || result.length < 3 || !result[0] || !result[1] || !result[2])
    return rgb;

  const r = parseInt(result[0], 10);
  const g = parseInt(result[1], 10);
  const b = parseInt(result[2], 10);

  // Convert to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default function HtmlEditingToolbar({
  onFormatApply,
  className = "",
  primaryColor = "#3b82f6",
}: HtmlEditingToolbarProps) {
  const [linkDialog, setLinkDialog] = useState<LinkDialogData>({
    url: "",
    text: "",
    isOpen: false,
    color: primaryColor,
  });

  const [imageDialog, setImageDialog] = useState<ImageDialogData>({
    url: "",
    alt: "",
    link: "",
    isOpen: false,
  });

  // Store the selection when opening dialogs
  const [savedSelection, setSavedSelection] = useState<{
    range: Range | null;
    selection: string;
  } | null>(null);

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Font size and font family state
  const [fontSize, setFontSize] = useState<string>("16");
  const [fontFamily, setFontFamily] = useState<string>("inherit");

  // Media selection state
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<"url" | "media">(
    "media"
  );

  // Image cropping state
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [cropperMedia, setCropperMedia] = useState<MediaItem | null>(null);

  // Listen for edit events from links and images
  React.useEffect(() => {
    const handleEditLink = (event: CustomEvent) => {
      const { element, url, text } = event.detail;
      // Get the actual computed color of the link
      const computedStyle = window.getComputedStyle(element);
      let currentColor = element.style.color || computedStyle.color;

      // Convert RGB color to hex if needed for color picker compatibility
      if (currentColor && currentColor.startsWith("rgb")) {
        currentColor = rgbToHex(currentColor);
      }

      setLinkDialog({
        url: url || "",
        text: text || "",
        isOpen: true,
        color: currentColor || primaryColor,
        element: element,
      });
    };

    const handleEditImage = (event: CustomEvent) => {
      const { element, url, alt } = event.detail;
      // Check if image is wrapped in a link
      const parentLink = element.closest("a");
      const linkUrl = parentLink ? parentLink.href : "";

      setImageDialog({
        url: url || "",
        alt: alt || "",
        link: linkUrl,
        isOpen: true,
        element: element,
      });

      // Pre-select the appropriate tab based on URL type
      if (url && url.includes("cdn.cosmicjs.com")) {
        setActiveImageTab("media");
      } else {
        setActiveImageTab("url");
      }
    };

    document.addEventListener("editLink", handleEditLink as EventListener);
    document.addEventListener("editImage", handleEditImage as EventListener);

    return () => {
      document.removeEventListener("editLink", handleEditLink as EventListener);
      document.removeEventListener(
        "editImage",
        handleEditImage as EventListener
      );
    };
  }, []);

  // Add keyboard shortcuts for undo/redo
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "z" && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if (event.key === "z" && event.shiftKey) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoStack, redoStack]);

  const handleFormat = (format: string, value?: string) => {
    // Save current state to undo stack before making changes
    const editableDiv = document.querySelector(
      '[contenteditable="true"]'
    ) as HTMLElement;
    if (editableDiv) {
      saveToUndoStack(editableDiv.innerHTML);
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    switch (format) {
      case "bold":
        onFormatApply("bold");
        break;
      case "italic":
        onFormatApply("italic");
        break;
      case "h1":
        onFormatApply("heading", "h1");
        break;
      case "h2":
        onFormatApply("heading", "h2");
        break;
      case "h3":
        onFormatApply("heading", "h3");
        break;
      case "paragraph":
        onFormatApply("heading", "p");
        break;
      case "align-left":
        onFormatApply("align", "left");
        break;
      case "align-center":
        onFormatApply("align", "center");
        break;
      case "align-right":
        onFormatApply("align", "right");
        break;
      case "link":
        handleLinkClick();
        break;
      case "image":
        handleImageClick();
        break;
    }
  };

  const handleLinkClick = () => {
    const selection = window.getSelection();
    let range: Range | null = null;
    let selectedText = "";

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();
      selectedText = selection.toString();
    }

    // Save the selection
    setSavedSelection({
      range: range,
      selection: selectedText,
    });

    // Open dialog
    setLinkDialog({
      url: "",
      text: selectedText,
      isOpen: true,
      color: primaryColor,
    });
  };

  const handleImageClick = () => {
    const selection = window.getSelection();
    let range: Range | null = null;

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();
    }

    // Save the selection
    setSavedSelection({
      range: range,
      selection: "",
    });

    // Reset image dialog state
    setImageDialog({
      url: "",
      alt: "",
      link: "",
      isOpen: true,
    });

    setSelectedMedia(null);
    setActiveImageTab("media");
  };

  // Save current content to undo stack
  const saveToUndoStack = (content: string) => {
    setUndoStack((prev) => [...prev, content]);
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  // Undo function
  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      const currentContent =
        document.querySelector('[contenteditable="true"]')?.innerHTML || "";

      setRedoStack((prev) => [...prev, currentContent]);
      setUndoStack((prev) => prev.slice(0, -1));

      // Apply the previous state
      const editableDiv = document.querySelector(
        '[contenteditable="true"]'
      ) as HTMLElement;
      if (editableDiv && lastState) {
        editableDiv.innerHTML = lastState;
      }
    }
  };

  // Redo function
  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      const currentContent =
        document.querySelector('[contenteditable="true"]')?.innerHTML || "";

      setUndoStack((prev) => [...prev, currentContent]);
      setRedoStack((prev) => prev.slice(0, -1));

      // Apply the next state
      const editableDiv = document.querySelector(
        '[contenteditable="true"]'
      ) as HTMLElement;
      if (editableDiv && nextState) {
        editableDiv.innerHTML = nextState;
      }
    }
  };

  const handleLinkSave = () => {
    if (!linkDialog.url.trim()) return;

    if (linkDialog.element) {
      // Editing existing link - directly set the href without HTML encoding
      linkDialog.element.href = linkDialog.url.trim();
      linkDialog.element.textContent =
        linkDialog.text.trim() || linkDialog.url.trim();

      // Apply selected color
      linkDialog.element.style.color = linkDialog.color;

      // Update external link attributes
      const url = linkDialog.url.trim();
      if (!url.startsWith("/") && !url.includes(window.location.hostname)) {
        linkDialog.element.target = "_blank";
        linkDialog.element.rel = "noopener noreferrer";
      } else {
        linkDialog.element.removeAttribute("target");
        linkDialog.element.removeAttribute("rel");
      }
    } else {
      // Creating new link - restore selection if available
      if (savedSelection?.range) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelection.range);
        }
      }

      onFormatApply(
        "link",
        JSON.stringify({
          url: linkDialog.url.trim(),
          text: linkDialog.text.trim() || linkDialog.url.trim(),
          color: linkDialog.color,
        })
      );
    }

    setLinkDialog({
      url: "",
      text: "",
      isOpen: false,
      color: primaryColor,
    });

    // Clear saved selection
    setSavedSelection(null);
  };

  const handleLinkUnlink = () => {
    if (linkDialog.element) {
      // Get the link text content before removing the link
      const linkText = linkDialog.element.textContent || "";
      const parentElement = linkDialog.element.parentNode;
      
      if (parentElement) {
        // Create a text node with the link's text content
        const textNode = document.createTextNode(linkText);
        
        // Replace the link element with just the text
        parentElement.replaceChild(textNode, linkDialog.element);
        
        // Trigger content change event to update the parent component
        const editableDiv = parentElement.closest('[contenteditable="true"]') as HTMLElement;
        if (editableDiv) {
          const contentChangeEvent = new CustomEvent('contentChanged', {
            detail: { content: editableDiv.innerHTML }
          });
          editableDiv.dispatchEvent(contentChangeEvent);
        }
      }
    }

    // Close the dialog
    setLinkDialog({
      url: "",
      text: "",
      isOpen: false,
      color: primaryColor,
    });

    // Clear saved selection
    setSavedSelection(null);
  };

  const handleMediaSelect = (media: MediaItem) => {
    setSelectedMedia(media);
    setImageDialog((prev) => ({
      ...prev,
      url: media.imgix_url || media.url,
      alt: media.alt_text || media.original_name || "Image",
    }));
  };

  // Handle crop button click in media library
  const handleMediaCrop = (media: MediaItem) => {
    if (!media.type.startsWith("image/")) {
      return;
    }
    setCropperMedia(media);
    setShowCropperModal(true);
  };

  // Handle crop completion
  const handleCropComplete = async (
    croppedImageFile: File,
    originalMedia: MediaItem
  ) => {
    try {
      // Upload the cropped image
      const formData = new FormData();
      formData.append("file", croppedImageFile);

      // Preserve folder from original if it exists
      if (originalMedia.folder) {
        formData.append("folder", originalMedia.folder);
      }

      // Set alt text based on original
      const croppedAltText = originalMedia.alt_text
        ? `${originalMedia.alt_text} (cropped)`
        : `${originalMedia.original_name} (cropped)`;
      formData.append("alt_text", croppedAltText);

      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload cropped image");
      }

      // Use the cropped image
      setSelectedMedia(data.media as MediaItem);
      setImageDialog((prev) => ({
        ...prev,
        url: data.media.imgix_url || data.media.url,
        alt: data.media.alt_text || data.media.original_name || "Image",
      }));
    } catch (error) {
      console.error("Error saving cropped image:", error);
      // You might want to show a toast notification here
    }
  };

  const handleImageSave = () => {
    let imageUrl = "";
    let altText = "";

    if (activeImageTab === "media" && selectedMedia) {
      // Use selected media
      imageUrl = selectedMedia.imgix_url || selectedMedia.url;
      altText =
        selectedMedia.alt_text || selectedMedia.original_name || "Image";

      // Add optimization parameters for better performance
      if (
        imageUrl.includes("imgix_url") ||
        imageUrl.includes("cdn.cosmicjs.com")
      ) {
        const separator = imageUrl.includes("?") ? "&" : "?";
        imageUrl = `${imageUrl}${separator}w=800&h=600&fit=crop&auto=format,compress`;
      }
    } else {
      // Use manual URL input
      imageUrl = imageDialog.url.trim();
      altText = imageDialog.alt.trim() || "Image";
    }

    if (!imageUrl) return;

    if (imageDialog.element) {
      // Editing existing image
      const currentParentLink = imageDialog.element.closest("a");

      // Update image properties
      imageDialog.element.src = imageUrl;
      imageDialog.element.alt = altText;

      // Apply styling
      imageDialog.element.style.maxWidth = "100%";
      imageDialog.element.style.height = "auto";
      imageDialog.element.style.display = "block";
      imageDialog.element.style.margin = "16px auto";

      // Handle link changes
      if (imageDialog.link.trim()) {
        if (currentParentLink) {
          // Update existing link - directly set href without HTML encoding
          currentParentLink.href = imageDialog.link.trim();
          // Add external link attributes for external URLs
          if (
            !imageDialog.link.trim().startsWith("/") &&
            !imageDialog.link.trim().includes(window.location.hostname)
          ) {
            currentParentLink.target = "_blank";
            currentParentLink.rel = "noopener noreferrer";
          } else {
            currentParentLink.removeAttribute("target");
            currentParentLink.removeAttribute("rel");
          }
        } else {
          // Wrap image in new link
          const link = document.createElement("a");
          link.href = imageDialog.link.trim();
          if (
            !imageDialog.link.trim().startsWith("/") &&
            !imageDialog.link.trim().includes(window.location.hostname)
          ) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }

          const parent = imageDialog.element.parentNode;
          if (parent) {
            parent.insertBefore(link, imageDialog.element);
            link.appendChild(imageDialog.element);
          }
        }
      } else {
        // Remove link if empty and one exists
        if (currentParentLink) {
          const parent = currentParentLink.parentNode;
          if (parent) {
            parent.insertBefore(imageDialog.element, currentParentLink);
            parent.removeChild(currentParentLink);
          }
        }
      }
    } else {
      // Creating new image - restore selection if available
      if (savedSelection?.range) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelection.range);
        }
      }

      onFormatApply(
        "image",
        JSON.stringify({
          url: imageUrl,
          alt: altText,
          link: imageDialog.link.trim(),
        })
      );
    }

    // Reset dialog state
    setImageDialog({
      url: "",
      alt: "",
      link: "",
      isOpen: false,
    });

    setSelectedMedia(null);
    setActiveImageTab("media");

    // Clear saved selection
    setSavedSelection(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div
          className={`toolbar-container flex items-center gap-1 p-2 bg-white border border-gray-300 rounded-lg shadow-sm min-w-max ${className}`}
          onMouseDown={(e) => e.preventDefault()} // Prevent focus loss when clicking toolbar
          style={{ minWidth: "fit-content" }}
        >
          {/* Text Styles Dropdown */}
          <div className="flex items-center pr-1 border-r border-gray-200 flex-shrink-0">
            <Select
              onValueChange={(value) => {
                handleFormat(value);
              }}
            >
              <SelectTrigger className="h-8 w-16 text-xs">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Normal</SelectItem>
                <SelectItem value="h1">Heading 1</SelectItem>
                <SelectItem value="h2">Heading 2</SelectItem>
                <SelectItem value="h3">Heading 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Formatting */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFormat("bold")}
              onMouseDown={(e) => e.preventDefault()}
              className="h-8 w-8 p-0"
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFormat("italic")}
              onMouseDown={(e) => e.preventDefault()}
              className="h-8 w-8 p-0"
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
          </div>

          {/* Font Family - Hidden on mobile */}
          <div className="hidden md:flex items-center px-1 border-r border-gray-200 flex-shrink-0">
            <Select
              value={fontFamily}
              onValueChange={(value) => {
                // Save current state before applying font family
                const editableDiv = document.querySelector(
                  '[contenteditable="true"]'
                ) as HTMLElement;
                if (editableDiv) {
                  saveToUndoStack(editableDiv.innerHTML);
                }

                const selectedFont = EMAIL_FONTS.find(
                  (font) => font.value === value
                );
                if (selectedFont) {
                  setFontFamily(value);
                  onFormatApply("font-family", selectedFont.family);
                }
              }}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <div className="flex items-center gap-1">
                  <Type className="h-3 w-3" />
                  <SelectValue
                    style={{
                      fontFamily:
                        fontFamily !== "inherit"
                          ? EMAIL_FONTS.find(
                              (font) => font.value === fontFamily
                            )?.family
                          : "inherit",
                    }}
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Default</SelectItem>
                <SelectItem
                  value="arial"
                  style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
                >
                  Arial
                </SelectItem>
                <SelectItem
                  value="helvetica"
                  style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
                >
                  Helvetica
                </SelectItem>
                <SelectItem
                  value="times"
                  style={{ fontFamily: 'Times, "Times New Roman", serif' }}
                >
                  Times
                </SelectItem>
                <SelectItem
                  value="georgia"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Georgia
                </SelectItem>
                <SelectItem
                  value="courier"
                  style={{ fontFamily: '"Courier New", Courier, monospace' }}
                >
                  Courier
                </SelectItem>
                <SelectItem
                  value="verdana"
                  style={{ fontFamily: "Verdana, Geneva, sans-serif" }}
                >
                  Verdana
                </SelectItem>
                <SelectItem
                  value="opensans"
                  style={{
                    fontFamily: '"Open Sans", Helvetica, Arial, sans-serif',
                  }}
                >
                  Open Sans
                </SelectItem>
                <SelectItem
                  value="roboto"
                  style={{ fontFamily: '"Roboto", Arial, sans-serif' }}
                >
                  Roboto
                </SelectItem>
                <SelectItem
                  value="lato"
                  style={{ fontFamily: '"Lato", Arial, sans-serif' }}
                >
                  Lato
                </SelectItem>
                <SelectItem
                  value="montserrat"
                  style={{ fontFamily: '"Montserrat", Helvetica, sans-serif' }}
                >
                  Montserrat
                </SelectItem>
                <SelectItem
                  value="quicksand"
                  style={{
                    fontFamily: '"Quicksand", Helvetica, Arial, sans-serif',
                  }}
                >
                  Quicksand
                </SelectItem>
                <SelectItem
                  value="futura"
                  style={{
                    fontFamily:
                      '"Futura", "Futura PT", Helvetica, Arial, sans-serif',
                  }}
                >
                  Futura
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Alignment Dropdown */}
          <div className="flex items-center px-1 border-r border-gray-200 flex-shrink-0">
            <Select
              onValueChange={(value) => {
                handleFormat(value);
              }}
            >
              <SelectTrigger className="h-8 w-14 text-xs">
                <SelectValue placeholder="Align" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="align-left">Left</SelectItem>
                <SelectItem value="align-center">Center</SelectItem>
                <SelectItem value="align-right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="flex items-center px-1 border-r border-gray-200 flex-shrink-0">
            <Select
              value={fontSize}
              onValueChange={(value) => {
                // Save current state before applying font size
                const editableDiv = document.querySelector(
                  '[contenteditable="true"]'
                ) as HTMLElement;
                if (editableDiv) {
                  saveToUndoStack(editableDiv.innerHTML);
                }

                setFontSize(value);
                onFormatApply("font-size", value);
              }}
            >
              <SelectTrigger className="h-8 w-14 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="14">14px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
                <SelectItem value="18">18px</SelectItem>
                <SelectItem value="20">20px</SelectItem>
                <SelectItem value="24">24px</SelectItem>
                <SelectItem value="28">28px</SelectItem>
                <SelectItem value="32">32px</SelectItem>
                <SelectItem value="36">36px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Links and Images */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFormat("link")}
              onMouseDown={(e) => e.preventDefault()}
              className="h-8 w-8 p-0"
              title="Add link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleFormat("image")}
              onMouseDown={(e) => e.preventDefault()}
              className="h-8 w-8 p-0"
              title="Insert image"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Link Dialog */}
      <Dialog
        open={linkDialog.isOpen}
        onOpenChange={(open) =>
          setLinkDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-blue-600" />
              <span>{linkDialog.element ? "Edit Link" : "Add Link"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="link-url">URL *</Label>
                {linkDialog.element && linkDialog.url.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = linkDialog.url.trim();
                      const fullUrl = url.startsWith("http")
                        ? url
                        : `https://${url}`;
                      window.open(fullUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-700 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Visit</span>
                  </button>
                )}
              </div>
              <Input
                id="link-url"
                value={linkDialog.url}
                onChange={(e) =>
                  setLinkDialog((prev) => ({ ...prev, url: e.target.value }))
                }
                onKeyDown={(e) => handleKeyDown(e, handleLinkSave)}
                placeholder="https://example.com"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text *</Label>
              <div className="flex space-x-2">
                <Input
                  id="link-text"
                  value={linkDialog.text}
                  onChange={(e) =>
                    setLinkDialog((prev) => ({ ...prev, text: e.target.value }))
                  }
                  onKeyDown={(e) => handleKeyDown(e, handleLinkSave)}
                  placeholder="Click here"
                  className="flex-1"
                />
                <div className="flex items-center space-x-1">
                  <input
                    type="color"
                    value={linkDialog.color}
                    onChange={(e) =>
                      setLinkDialog((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    title="Link color"
                  />
                  <Palette className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                {linkDialog.element && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLinkUnlink}
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    title="Remove link but keep text"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setLinkDialog({
                      url: "",
                      text: "",
                      isOpen: false,
                      color: primaryColor,
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkSave}
                  disabled={!linkDialog.url.trim() || !linkDialog.text.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {linkDialog.element ? "Update Link" : "Add Link"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Dialog with Media Library Integration and Cropping */}
      <Dialog
        open={imageDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setImageDialog({ url: "", alt: "", link: "", isOpen: false });
            setSelectedMedia(null);
            setActiveImageTab("media");
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-green-600" />
              <span>{imageDialog.element ? "Edit Image" : "Insert Image"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col pt-4">
            <Tabs
              value={activeImageTab}
              onValueChange={(value) =>
                setActiveImageTab(value as "url" | "media")
              }
            >
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger
                  value="media"
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Media Library</span>
                </TabsTrigger>
                <TabsTrigger
                  value="url"
                  className="flex items-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>URL</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                <TabsContent value="media" className="space-y-4 mt-0">
                  <div className="border rounded-lg p-4 max-h-[350px] overflow-y-auto">
                    <MediaLibrary
                      selectionMode={true}
                      onSelect={handleMediaSelect}
                      selectedMedia={selectedMedia}
                    />
                  </div>

                  {selectedMedia && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          {selectedMedia.type.startsWith("image/") ? (
                            <img
                              src={`${selectedMedia.imgix_url}?w=160&h=160&fit=crop&auto=format,compress`}
                              alt={
                                selectedMedia.alt_text ||
                                selectedMedia.original_name
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Image className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {selectedMedia.original_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(selectedMedia.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {selectedMedia.alt_text && (
                            <p className="text-xs text-gray-600 mt-1">
                              Alt: {selectedMedia.alt_text}
                            </p>
                          )}
                        </div>
                        {selectedMedia.type.startsWith("image/") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleMediaCrop(selectedMedia)}
                            className="flex items-center space-x-1"
                          >
                            <Crop className="h-4 w-4" />
                            <span>Crop</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="url" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="image-url">Image URL *</Label>
                    <Input
                      id="image-url"
                      value={imageDialog.url}
                      onChange={(e) =>
                        setImageDialog((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleKeyDown(e, handleImageSave)}
                      placeholder="https://example.com/image.jpg"
                      autoFocus={activeImageTab === "url"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image-alt-url">Alt Text</Label>
                    <Input
                      id="image-alt-url"
                      value={imageDialog.alt}
                      onChange={(e) =>
                        setImageDialog((prev) => ({
                          ...prev,
                          alt: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => handleKeyDown(e, handleImageSave)}
                      placeholder="Describe the image"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Link URL field (shared between tabs) - Now inside the scrollable area */}
            <div className="space-y-2 mt-4 flex-shrink-0">
              <Label htmlFor="image-link">Link URL (optional)</Label>
              <Input
                id="image-link"
                value={imageDialog.link}
                onChange={(e) =>
                  setImageDialog((prev) => ({ ...prev, link: e.target.value }))
                }
                onKeyDown={(e) => handleKeyDown(e, handleImageSave)}
                placeholder="https://example.com"
              />
              <p className="text-xs text-gray-500">
                Make the image clickable by adding a link URL
              </p>
            </div>
          </div>

          {/* Fixed footer outside the scrollable area */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <Button
              variant="outline"
              onClick={() => {
                setImageDialog({ url: "", alt: "", link: "", isOpen: false });
                setSelectedMedia(null);
                setActiveImageTab("media");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImageSave}
              disabled={
                activeImageTab === "media"
                  ? !selectedMedia
                  : !imageDialog.url.trim()
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {imageDialog.element ? "Update Image" : "Insert Image"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropperModal}
        onOpenChange={setShowCropperModal}
        mediaItem={cropperMedia}
        onCropComplete={handleCropComplete}
        onError={(error) => {
          console.error("Crop error:", error);
          // You might want to show a toast notification here
        }}
      />
    </>
  );
}