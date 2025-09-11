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
} from "lucide-react";

interface HtmlEditingToolbarProps {
  onFormatApply: (format: string, value?: string) => void;
  getActiveFormats?: () => {
    bold: boolean;
    italic: boolean;
    heading: string | null; // 'h1', 'h2', 'h3', or null
  };
  className?: string;
}

interface LinkDialogData {
  url: string;
  text: string;
  isOpen: boolean;
}

interface ImageDialogData {
  url: string;
  alt: string;
  isOpen: boolean;
}

export default function HtmlEditingToolbar({
  onFormatApply,
  className = "",
}: HtmlEditingToolbarProps) {
  const [linkDialog, setLinkDialog] = useState<LinkDialogData>({
    url: "",
    text: "",
    isOpen: false,
  });

  const [imageDialog, setImageDialog] = useState<ImageDialogData>({
    url: "",
    alt: "",
    isOpen: false,
  });

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
    if (!selection || selection.isCollapsed) {
      // If no text is selected, show dialog with empty text field
      setLinkDialog({
        url: "",
        text: "",
        isOpen: true,
      });
    } else {
      // If text is selected, use it as default link text
      const selectedText = selection.toString();
      setLinkDialog({
        url: "",
        text: selectedText,
        isOpen: true,
      });
    }
  };

  const handleImageClick = () => {
    setImageDialog({
      url: "",
      alt: "",
      isOpen: true,
    });
  };

  const handleLinkSave = () => {
    if (!linkDialog.url.trim()) return;

    onFormatApply(
      "link",
      JSON.stringify({
        url: linkDialog.url.trim(),
        text: linkDialog.text.trim() || linkDialog.url.trim(),
      })
    );

    setLinkDialog({
      url: "",
      text: "",
      isOpen: false,
    });
  };

  const handleImageSave = () => {
    if (!imageDialog.url.trim()) return;

    onFormatApply(
      "image",
      JSON.stringify({
        url: imageDialog.url.trim(),
        alt: imageDialog.alt.trim() || "Image",
      })
    );

    setImageDialog({
      url: "",
      alt: "",
      isOpen: false,
    });
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
              <span>Add Link</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL *</Label>
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
              <Input
                id="link-text"
                value={linkDialog.text}
                onChange={(e) =>
                  setLinkDialog((prev) => ({ ...prev, text: e.target.value }))
                }
                onKeyDown={(e) => handleKeyDown(e, handleLinkSave)}
                placeholder="Click here"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setLinkDialog({ url: "", text: "", isOpen: false })
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkSave}
                disabled={!linkDialog.url.trim() || !linkDialog.text.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Link
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
              <span>Insert Image</span>
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
                Insert Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
