"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, text: string) => void;
  onVisit?: (url: string) => void;
  initialUrl?: string;
  initialText?: string;
}

/**
 * Shared link dialog component used by both Create and Edit template forms
 * Consolidates the link creation/editing UI logic
 */
export default function LinkDialog({
  isOpen,
  onClose,
  onSave,
  onVisit,
  initialUrl = "",
  initialText = "",
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setUrl(initialUrl);
    setText(initialText);
  }, [initialUrl, initialText]);

  const handleSave = () => {
    if (!url.trim() || !text.trim()) return;
    onSave(url.trim(), text.trim());
    onClose();
  };

  const handleVisit = () => {
    if (url.trim() && onVisit) {
      onVisit(url.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url.trim() && text.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialUrl ? "Edit Link" : "Add Link"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-text">Link Text *</Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Click here"
            />
          </div>
          <div className="flex justify-between pt-4">
            <div>
              {url.trim() && onVisit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVisit}
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!url.trim() || !text.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {initialUrl ? "Update Link" : "Add Link"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
