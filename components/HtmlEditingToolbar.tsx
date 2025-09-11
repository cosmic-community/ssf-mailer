"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Image,
  Type,
  ExternalLink,
  Palette,
} from "lucide-react";

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
  isOpen: boolean;
  element?: HTMLImageElement; // For editing existing images
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
    isOpen: false,
  });

  // Store the selection when opening dialogs
  const [savedSelection, setSavedSelection] = useState<{
    range: Range | null;
    selection: string;
  } | null>(null);

  // Listen for edit events from links and images
  React.useEffect(() => {
    const handleEditLink = (event: CustomEvent) => {
      const { element, url, text } = event.detail;
      setLinkDialog({
        url: url || "",
        text: text || "",
        isOpen: true,
        color: element.style.color || primaryColor,
        element: element,
      });
    };

    const handleEditImage = (event: CustomEvent) => {
      const { element, url, alt } = event.detail;
      setImageDialog({
        url: url || "",
        alt: alt || "",
        isOpen: true,
        element: element,
      });
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

  const handleFormat = (format: string) => {
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

    setImageDialog({
      url: "",
      alt: "",
      isOpen: true,
    });
  };

  const handleLinkSave = () => {
    if (!linkDialog.url.trim()) return;

    if (linkDialog.element) {
      // Editing existing link
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

  const handleImageSave = () => {
    if (!imageDialog.url.trim()) return;

    if (imageDialog.element) {
      // Editing existing image
      imageDialog.element.src = imageDialog.url.trim();
      imageDialog.element.alt = imageDialog.alt.trim() || "Image";

      // Apply styling
      imageDialog.element.style.maxWidth = "100%";
      imageDialog.element.style.height = "auto";
      imageDialog.element.style.display = "block";
      imageDialog.element.style.margin = "16px auto";
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
          url: imageDialog.url.trim(),
          alt: imageDialog.alt.trim() || "Image",
        })
      );
    }

    setImageDialog({
      url: "",
      alt: "",
      isOpen: false,
    });

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
      <div
        className={`toolbar-container flex items-center space-x-1 p-2 bg-white border border-gray-300 rounded-lg shadow-sm ${className}`}
        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss when clicking toolbar
      >
        {/* Text Style Buttons */}
        <div className="flex items-center space-x-1 pr-2 border-r border-gray-200">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFormat("paragraph")}
            onMouseDown={(e) => e.preventDefault()}
            className="h-8 px-2"
            title="Normal text"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFormat("h1")}
            onMouseDown={(e) => e.preventDefault()}
            className="h-8 px-2"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFormat("h2")}
            onMouseDown={(e) => e.preventDefault()}
            className="h-8 px-2"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFormat("h3")}
            onMouseDown={(e) => e.preventDefault()}
            className="h-8 px-2"
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Text Formatting */}
        <div className="flex items-center space-x-1 pr-2 border-r border-gray-200">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFormat("bold")}
            onMouseDown={(e) => e.preventDefault()}
            className="h-8 px-2"
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
            className="h-8 px-2"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>

        {/* Links and Images */}
        <div className="flex items-center space-x-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleFormat("link")}
            onMouseDown={(e) => e.preventDefault()}
            className="h-8 px-2"
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
            className="h-8 px-2"
            title="Insert image"
          >
            <Image className="h-4 w-4" />
          </Button>
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
            <div className="flex justify-end space-x-2 pt-4">
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
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog
        open={imageDialog.isOpen}
        onOpenChange={(open) =>
          setImageDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-green-600" />
              <span>{imageDialog.element ? "Edit Image" : "Insert Image"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL *</Label>
              <Input
                id="image-url"
                value={imageDialog.url}
                onChange={(e) =>
                  setImageDialog((prev) => ({ ...prev, url: e.target.value }))
                }
                onKeyDown={(e) => handleKeyDown(e, handleImageSave)}
                placeholder="https://example.com/image.jpg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-alt">Alt Text</Label>
              <Input
                id="image-alt"
                value={imageDialog.alt}
                onChange={(e) =>
                  setImageDialog((prev) => ({ ...prev, alt: e.target.value }))
                }
                onKeyDown={(e) => handleKeyDown(e, handleImageSave)}
                placeholder="Describe the image"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setImageDialog({ url: "", alt: "", isOpen: false })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleImageSave}
                disabled={!imageDialog.url.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {imageDialog.element ? "Update Image" : "Insert Image"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
