"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  FileText,
  Image,
  File,
  Plus,
  Link,
  Globe,
  Wand2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import HtmlEditingToolbar from "./HtmlEditingToolbar";
import {
  applyFormat,
  cleanupHtml,
  applyStylesToContent,
} from "@/utils/htmlFormatting";
import { Settings } from "@/types";

interface ContextItem {
  id: string;
  url: string;
  type: "file" | "webpage";
  status: "pending" | "analyzing" | "ready" | "error";
  title?: string;
  error?: string;
}

// Link editing dialog component
interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, text: string) => void;
  onVisit?: (url: string) => void;
  initialUrl?: string;
  initialText?: string;
}

function LinkDialog({
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
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-blue-600" />
            <span>{initialUrl ? "Edit Link" : "Add Link"}</span>
          </DialogTitle>
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
          <div className="flex justify-between items-center pt-4">
            <div className="flex space-x-2">
              {initialUrl && onVisit && (
                <Button
                  variant="outline"
                  onClick={handleVisit}
                  className="flex items-center space-x-1"
                  type="button"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Visit</span>
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

export default function CreateTemplateForm() {
  const router = useRouter();
  const { toasts, addToast, removeToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [isAIEditing, setIsAIEditing] = useState(false);
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const [showEditPrompt, setShowEditPrompt] = useState(false); // New state for showing edit section

  // Simple editing states
  const [isEditing, setIsEditing] = useState(false);

  // Link editing states
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkDialogData, setLinkDialogData] = useState<{
    url: string;
    text: string;
    element?: HTMLElement;
  }>({ url: "", text: "" });
  const [savedSelection, setSavedSelection] = useState<Selection | null>(null);

  // Context items state - maintain separate contexts but allow sharing
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [editContextItems, setEditContextItems] = useState<ContextItem[]>([]);
  const [showContextInput, setShowContextInput] = useState(false);
  const [showEditContextInput, setShowEditContextInput] = useState(false);
  const [contextUrl, setContextUrl] = useState("");
  const [editContextUrl, setEditContextUrl] = useState("");
  const [preserveContext, setPreserveContext] = useState(true); // New state for context preservation

  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const editPromptRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    template_type: "Newsletter", // Use exact value from select-dropdown
    active: true,
  });

  // Settings state for primary color
  const [settings, setSettings] = useState<Settings | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  // Handle keyboard shortcuts for AI prompt textareas
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    action: "generate" | "edit"
  ) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (action === "generate") {
        handleAIGenerate();
      } else if (action === "edit") {
        handleAIEdit();
      }
    }
  };

  // Set up auto-resize for textareas
  useEffect(() => {
    const textareas = [
      aiPromptRef.current,
      editPromptRef.current,
      contentRef.current,
    ].filter(Boolean) as HTMLTextAreaElement[];

    textareas.forEach((textarea) => {
      const handleInput = () => autoResize(textarea);
      textarea.addEventListener("input", handleInput);

      // Initial resize
      autoResize(textarea);

      return () => textarea.removeEventListener("input", handleInput);
    });
  }, []);

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // Initialize content in contentEditable divs
  useEffect(() => {
    if (previewRef.current && !previewRef.current.innerHTML) {
      previewRef.current.innerHTML =
        formData.content || "<p>Start typing your email content here...</p>";
      const primaryColor = settings?.metadata?.primary_brand_color || "#3b82f6";
      applyStylesToContent(previewRef.current, primaryColor);
    }
  }, [formData.content, settings]);

  // Update contentEditable divs when content changes externally (like from AI)
  useEffect(() => {
    if (
      previewRef.current &&
      previewRef.current.innerHTML !== formData.content
    ) {
      // Only update if the content is different and we're not currently typing
      if (document.activeElement !== previewRef.current) {
        previewRef.current.innerHTML =
          formData.content || "<p>Start typing your email content here...</p>";
        const primaryColor =
          settings?.metadata?.primary_brand_color || "#3b82f6";
        applyStylesToContent(previewRef.current, primaryColor);
      }
    }
  }, [formData.content, settings]);

  // Handle format application from toolbar
  const handleFormatApply = (format: string, value?: string) => {
    const previewDiv = previewRef.current;
    if (!previewDiv) return;

    // Get primary color from settings
    const primaryColor = settings?.metadata?.primary_brand_color || "#3b82f6";

    // Apply formatting directly to the contentEditable div
    applyFormat(previewDiv, format, value, primaryColor);

    // Update React state with the new content
    const updatedContent = previewDiv.innerHTML;
    setFormData((prev) => ({
      ...prev,
      content: updatedContent,
    }));
  };

  // Link management functions
  const saveCurrentSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedSelection(selection);
    }
  };

  const restoreSelection = () => {
    if (savedSelection && savedSelection.rangeCount > 0) {
      try {
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(savedSelection.getRangeAt(0));
      } catch (e) {
        console.warn("Could not restore selection:", e);
      }
    }
  };

  const handleAddLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      addToast("Please select some text to convert to a link", "error");
      return;
    }

    const selectedText = selection.toString();
    saveCurrentSelection();

    setLinkDialogData({ url: "", text: selectedText });
    setShowLinkDialog(true);
  };

  const handleEditLink = (element: HTMLElement) => {
    const url = element.getAttribute("href") || "";
    const text = element.textContent || "";

    setLinkDialogData({ url, text, element });
    setShowLinkDialog(true);
  };

  const handleVisitLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleLinkSave = (url: string, text: string) => {
    if (linkDialogData.element) {
      // Editing existing link
      linkDialogData.element.setAttribute("href", url);
      linkDialogData.element.textContent = text;
      // Don't force color - preserve existing styles
    } else {
      // Creating new link from selection
      restoreSelection();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const link = document.createElement("a");
        link.href = url;
        link.textContent = text;
        // Don't force color - let CSS handle styling

        // Add external link icon for external links
        if (!url.startsWith("/") && !url.includes(window.location.hostname)) {
          const icon = document.createElement("span");
          icon.innerHTML =
            ' <svg class="inline w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path></svg>';
          link.appendChild(icon);
        }

        // Prevent default click behavior during editing
        link.addEventListener("click", (e) => {
          if (isEditing) {
            e.preventDefault();
            e.stopPropagation();
          }
        });

        range.deleteContents();
        range.insertNode(link);
        selection.removeAllRanges();
      }
    }

    // Update form data with new content
    const previewDiv = previewRef.current;
    if (previewDiv) {
      setFormData((prev) => ({
        ...prev,
        content: previewDiv.innerHTML,
      }));
    }

    addToast("Link updated successfully", "success");
  };

  // Enhanced inline editing with link management - Fixed function signature
  const startEditMode = useCallback(
    (previewRef: React.RefObject<HTMLDivElement>) => {
      if (!previewRef.current || isEditing || isAIGenerating || isAIEditing)
        return;

      console.log("Starting edit mode");
      setIsEditing(true);

      const previewDiv = previewRef.current;
      previewDiv.contentEditable = "true";
      previewDiv.style.outline = "2px solid #3b82f6";
      previewDiv.style.outlineOffset = "2px";
      previewDiv.style.backgroundColor = "#fefefe";
      previewDiv.focus();

      // Store the initial content for comparison
      const initialContent = previewDiv.innerHTML;
      let toolbar: HTMLDivElement | null = null;

      // Function to position toolbar relative to selection
      const positionToolbar = (targetRect: DOMRect) => {
        if (!toolbar) return;

        const toolbarHeight = 44; // Approximate toolbar height
        const margin = 8;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calculate position
        let top = targetRect.top - toolbarHeight - margin;
        let left = targetRect.left + targetRect.width / 2;

        // If not enough space above, position below
        if (top < margin) {
          top = targetRect.bottom + margin;
        }

        // Center the toolbar horizontally relative to selection, but keep it in viewport
        const toolbarWidth = 280; // Approximate toolbar width
        left = Math.max(
          margin,
          Math.min(
            viewportWidth - toolbarWidth - margin,
            left - toolbarWidth / 2
          )
        );

        toolbar.style.top = `${top}px`;
        toolbar.style.left = `${left}px`;
        toolbar.style.display = "flex";
      };

      // Function to hide toolbar
      const hideToolbar = () => {
        if (toolbar) {
          toolbar.style.display = "none";
        }
      };

      // Function to show toolbar with add link button
      const showLinkToolbar = (targetRect: DOMRect) => {
        if (!toolbar) return;

        toolbar.innerHTML = `
        <button id="add-link-btn" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1" title="Add link to selected text">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z" clip-rule="evenodd"></path>
            <path fill-rule="evenodd" d="M7.414 15.414a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 005.656 5.656l1.5-1.5a1 1 0 00-1.414-1.414l-1.5 1.5z" clip-rule="evenodd"></path>
          </svg>
          <span>Add Link</span>
        </button>
        <div class="text-xs text-gray-500 px-2 whitespace-nowrap">Press Esc to finish</div>
      `;

        positionToolbar(targetRect);

        // Add event listener for add link button
        const addLinkBtn = toolbar.querySelector(
          "#add-link-btn"
        ) as HTMLButtonElement;
        addLinkBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAddLink();
        });
      };

      // Function to show toolbar with edit link buttons
      const showEditLinkToolbar = (
        targetRect: DOMRect,
        linkElement: HTMLElement
      ) => {
        if (!toolbar) return;

        const url = linkElement.getAttribute("href") || "";

        toolbar.innerHTML = `
        <button id="edit-link-btn" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1" title="Edit link">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
          </svg>
          <span>Edit</span>
        </button>
        <button id="visit-link-btn" class="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center space-x-1" title="Visit link in new tab">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
            <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"></path>
          </svg>
          <span>Visit</span>
        </button>
        <div class="text-xs text-gray-500 px-2 whitespace-nowrap">Press Esc to finish</div>
      `;

        positionToolbar(targetRect);

        // Add event listener for edit link button
        const editLinkBtn = toolbar.querySelector(
          "#edit-link-btn"
        ) as HTMLButtonElement;
        editLinkBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleEditLink(linkElement);
        });

        // Add event listener for visit link button
        const visitLinkBtn = toolbar.querySelector(
          "#visit-link-btn"
        ) as HTMLButtonElement;
        visitLinkBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (url) {
            handleVisitLink(url);
          }
        });
      };

      // Create toolbar (initially hidden)
      toolbar = document.createElement("div");
      toolbar.className =
        "fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 items-center space-x-2 z-50";
      toolbar.style.display = "none";
      document.body.appendChild(toolbar);

      // Handle text selection changes
      const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || !previewDiv.contains(selection.anchorNode)) {
          hideToolbar();
          return;
        }

        if (selection.isCollapsed) {
          hideToolbar();
          return;
        }

        // Check if selection is plain text (not within a link)
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        // Check if selection spans across or is within a link
        const isInLink = (node: Node | null): HTMLElement | null => {
          let current = node;
          while (current && current !== previewDiv) {
            if (
              current.nodeType === Node.ELEMENT_NODE &&
              (current as Element).tagName === "A"
            ) {
              return current as HTMLElement;
            }
            current = current.parentNode;
          }
          return null;
        };

        const startLink = isInLink(
          startContainer.nodeType === Node.TEXT_NODE
            ? startContainer.parentNode
            : startContainer
        );
        const endLink = isInLink(
          endContainer.nodeType === Node.TEXT_NODE
            ? endContainer.parentNode
            : endContainer
        );

        // Only show add link button for plain text selections (not in links)
        if (!startLink && !endLink) {
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            showLinkToolbar(rect);
          }
        } else {
          hideToolbar();
        }
      };

      // Add selection change listener
      document.addEventListener("selectionchange", handleSelectionChange);

      // Add click handlers for existing links
      const links = previewDiv.querySelectorAll("a");
      const linkClickHandlers = new Map<HTMLElement, (e: Event) => void>();

      links.forEach((link) => {
        // Ensure link has proper styling
        link.style.color = "#3b82f6";
        link.style.textDecoration = "underline";

        // Disable link navigation during editing
        const originalHref = link.href;
        link.href = "javascript:void(0)";

        const clickHandler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();

          // Show edit link toolbar
          const rect = link.getBoundingClientRect();
          showEditLinkToolbar(rect, link);

          // Clear any text selection
          window.getSelection()?.removeAllRanges();
        };

        link.addEventListener("click", clickHandler);
        linkClickHandlers.set(link, clickHandler);

        // Add visual indicator for editable links
        link.style.position = "relative";
        link.style.cursor = "pointer";
        link.classList.add("hover:bg-blue-50");

        // Store original href for restoration
        link.setAttribute("data-original-href", originalHref);
      });

      // Function to finish editing and update state
      const finishEditing = () => {
        if (!previewDiv || !isEditing) return;

        console.log("Finishing edit mode");
        previewDiv.contentEditable = "false";
        previewDiv.style.outline = "none";
        previewDiv.style.outlineOffset = "initial";
        previewDiv.style.backgroundColor = "transparent";

        // Remove toolbar
        if (toolbar) {
          toolbar.remove();
          toolbar = null;
        }

        // Remove selection change listener
        document.removeEventListener("selectionchange", handleSelectionChange);

        // Restore link hrefs and remove handlers
        const currentLinks = previewDiv.querySelectorAll("a");
        currentLinks.forEach((link) => {
          const originalHref = link.getAttribute("data-original-href");
          if (originalHref) {
            link.href = originalHref;
            link.removeAttribute("data-original-href");
          }

          link.classList.remove("hover:bg-blue-50");
          link.style.cursor = "auto";

          // Remove click handlers
          const handler = linkClickHandlers.get(link);
          if (handler) {
            link.removeEventListener("click", handler);
          }

          // Add external link functionality
          if (
            !link.href.startsWith("/") &&
            !link.href.includes(window.location.hostname)
          ) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
          }
        });

        // Get the updated content
        const updatedContent = previewDiv.innerHTML;

        // Only update if content actually changed
        if (updatedContent !== initialContent) {
          console.log("Content changed, updating form state");
          setFormData((prev) => ({
            ...prev,
            content: updatedContent,
          }));
        }

        setIsEditing(false);

        // Remove event listeners
        previewDiv.removeEventListener("blur", handleBlur);
        document.removeEventListener("keydown", handleKeyDown);
      };

      const handleBlur = (e: FocusEvent) => {
        // Don't finish editing if clicking on toolbar or dialog
        const target = e.relatedTarget as Element;
        if (
          target &&
          (toolbar?.contains(target) || target.closest('[role="dialog"]'))
        ) {
          return;
        }

        // Small delay to allow clicking on buttons without losing focus
        setTimeout(() => {
          if (
            !previewDiv.contains(document.activeElement) &&
            (!toolbar || !toolbar.contains(document.activeElement as Node)) &&
            !document.querySelector('[role="dialog"]')
          ) {
            finishEditing();
          }
        }, 200);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          finishEditing();
        }
      };

      // Add event listeners
      previewDiv.addEventListener("blur", handleBlur);
      document.addEventListener("keydown", handleKeyDown);
    },
    [isEditing, isAIGenerating, isAIEditing, addToast]
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  };

  // Detect content type from URL
  const detectContentType = (url: string): "file" | "webpage" => {
    // Check if it's a direct file URL
    const fileExtensions = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
      "svg",
      "pdf",
      "doc",
      "docx",
      "txt",
      "rtf",
      "md",
      "xls",
      "xlsx",
      "csv",
      "ppt",
      "pptx",
    ];

    const extension = url.split(".").pop()?.toLowerCase();
    if (extension && fileExtensions.includes(extension)) {
      return "file";
    }

    // Check if it's a Cosmic CDN URL or other direct file URLs
    if (
      url.includes("cdn.cosmicjs.com") ||
      url.includes("/uploads/") ||
      url.includes("/files/")
    ) {
      return "file";
    }

    // Otherwise, treat as webpage
    return "webpage";
  };

  // Get appropriate icon for content type
  const getContextIcon = (item: ContextItem) => {
    if (item.type === "webpage") {
      return <Globe className="h-4 w-4" />;
    }

    const extension = item.url.split(".").pop()?.toLowerCase();
    if (!extension) return <File className="h-4 w-4" />;

    const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
    const documentTypes = ["pdf", "doc", "docx", "txt", "rtf", "md"];

    if (imageTypes.includes(extension)) return <Image className="h-4 w-4" />;
    if (documentTypes.includes(extension))
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  // Add context item
  const addContextItem = (url: string, isEdit: boolean = false) => {
    if (!url.trim()) return;

    const newItem: ContextItem = {
      id: Date.now().toString(),
      url: url.trim(),
      type: detectContentType(url.trim()),
      status: "pending",
    };

    if (isEdit) {
      setEditContextItems((prev) => [...prev, newItem]);
      setEditContextUrl("");
      setShowEditContextInput(false);
    } else {
      setContextItems((prev) => [...prev, newItem]);
      setContextUrl("");
      setShowContextInput(false);
    }
  };

  // Remove context item
  const removeContextItem = (id: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditContextItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setContextItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Share context from generation to editing
  const shareContextToEdit = () => {
    setEditContextItems((prev) => [...prev, ...contextItems]);
    addToast("Context items shared with editor", "success");
  };

  // Handle context URL input
  const handleContextUrlKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const url = isEdit ? editContextUrl : contextUrl;
      addContextItem(url, isEdit);
    } else if (e.key === "Escape") {
      if (isEdit) {
        setShowEditContextInput(false);
        setEditContextUrl("");
      } else {
        setShowContextInput(false);
        setContextUrl("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create template");
      }

      addToast("Template created successfully!", "success");
      scrollToTop();

      // Navigate to templates page after a short delay and refresh data
      setTimeout(() => {
        router.push("/templates");
        router.refresh(); // Ensure fresh data is fetched
      }, 1500);
    } catch (err: any) {
      addToast(
        err.message || "Failed to create template. Please try again.",
        "error"
      );
      scrollToTop();
      console.error("Template creation error:", err);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      addToast("Please enter a prompt for AI generation", "error");
      return;
    }

    setIsAIGenerating(true);
    setStreamingContent("");
    setAiStatus("Starting generation...");
    setAiProgress(0);

    try {
      const response = await fetch("/api/templates/generate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          type: formData.template_type,
          context_items: contextItems.filter(
            (item) => item.status === "ready" || item.status === "pending"
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI content");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "status") {
                  setAiStatus(data.message);
                  setAiProgress(data.progress || 0);
                } else if (data.type === "content") {
                  accumulatedContent += data.text;
                  setStreamingContent(accumulatedContent);
                  setFormData((prev) => ({
                    ...prev,
                    content: accumulatedContent,
                  }));
                } else if (data.type === "complete") {
                  setFormData((prev) => ({
                    ...prev,
                    content: data.data.content, // Only set content, no subject
                  }));
                  setAiStatus("Generation complete!");
                  setAiProgress(100);
                  setHasGeneratedContent(true);

                  // NEW: Automatically transition to edit mode
                  setTimeout(() => {
                    setShowEditPrompt(true);

                    // Share context if preservation is enabled
                    if (preserveContext && contextItems.length > 0) {
                      setEditContextItems((prev) => [...prev, ...contextItems]);
                    }

                    // Clear generation prompt but keep context if preserving
                    setAIPrompt("");
                    if (!preserveContext) {
                      setContextItems([]);
                    }

                    // Focus edit prompt
                    setTimeout(() => {
                      if (editPromptRef.current) {
                        editPromptRef.current.focus();
                      }
                    }, 100);

                    addToast(
                      "Ready to edit! Add refinement instructions below.",
                      "success"
                    );
                  }, 1500);

                  // Auto-resize content textarea after update
                  setTimeout(() => {
                    if (contentRef.current) {
                      autoResize(contentRef.current);
                    }
                  }, 100);
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("AI generation error:", error);
      addToast("Failed to generate AI content. Please try again.", "error");
      setAiStatus("Generation failed");
    } finally {
      setIsAIGenerating(false);
      setTimeout(() => {
        setAiStatus("");
        setAiProgress(0);
      }, 2000);
    }
  };

  const handleGenerateSubject = async () => {
    if (!formData.content.trim()) {
      addToast("Please generate or add email content first", "error");
      return;
    }

    setIsGeneratingSubject(true);
    try {
      const response = await fetch("/api/templates/generate-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: formData.content,
          templateType: formData.template_type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate subject line");
      }

      const result = await response.json();

      if (result.success && result.subject) {
        setFormData((prev) => ({
          ...prev,
          subject: result.subject,
        }));
        addToast(
          result.fallback
            ? "Subject generated (fallback)"
            : "Subject generated successfully!",
          "success"
        );
      } else {
        throw new Error("No subject received");
      }
    } catch (error) {
      console.error("Subject generation error:", error);
      addToast("Failed to generate subject line. Please try again.", "error");
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  const handleAIEdit = async () => {
    if (!editPrompt.trim()) {
      addToast("Please enter instructions for AI editing", "error");
      return;
    }

    if (!formData.content.trim()) {
      addToast("Please generate or add content first before editing", "error");
      return;
    }

    setIsAIEditing(true);
    setStreamingContent("");
    setAiStatus("Starting AI editing...");
    setAiProgress(0);

    try {
      const response = await fetch("/api/templates/edit-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: editPrompt,
          currentContent: formData.content,
          currentSubject: formData.subject,
          templateId: "new",
          context_items: editContextItems.filter(
            (item) => item.status === "ready" || item.status === "pending"
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to edit content with AI");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "status") {
                  setAiStatus(data.message);
                  setAiProgress(data.progress || 0);
                } else if (data.type === "content") {
                  accumulatedContent += data.text;
                  setStreamingContent(accumulatedContent);
                  setFormData((prev) => ({
                    ...prev,
                    content: accumulatedContent,
                  }));
                } else if (data.type === "complete") {
                  setFormData((prev) => ({
                    ...prev,
                    content: data.data.content,
                    subject: data.data.subject || prev.subject,
                  }));
                  setEditPrompt("");
                  setAiStatus("Editing complete!");
                  setAiProgress(100);
                  addToast(
                    "Content edited successfully! Continue editing or save template.",
                    "success"
                  );

                  // Auto-resize content textarea after update
                  setTimeout(() => {
                    if (contentRef.current) {
                      autoResize(contentRef.current);
                    }
                  }, 100);
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("AI editing error:", error);
      addToast("Failed to edit content with AI. Please try again.", "error");
      setAiStatus("Editing failed");
    } finally {
      setIsAIEditing(false);
      setTimeout(() => {
        setAiStatus("");
        setAiProgress(0);
      }, 2000);
    }
  };

  // Auto-focus AI prompt when AI section is shown
  const handleAISectionFocus = (ref: React.RefObject<HTMLTextAreaElement>) => {
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
      }
    }, 100);
  };

  // Reset to generation mode
  const resetToGenerate = () => {
    setShowEditPrompt(false);
    setEditPrompt("");
    setEditContextItems([]);
    setHasGeneratedContent(false);
    setFormData((prev) => ({ ...prev, content: "", subject: prev.subject }));
    addToast("Reset to generation mode", "success");
  };

  // Handle cancel
  const handleCancel = () => {
    router.back();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="space-y-6">
        {/* Unsaved Changes Warning */}

        {/* Error Messages */}
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Success Messages */}
        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Template Details Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Template Details</CardTitle>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    isLoading ||
                    !formData.name.trim() ||
                    !formData.subject.trim() ||
                    !formData.content.trim()
                  }
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                  size="sm"
                >
                  {isLoading ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter template name"
                disabled={isLoading}
                required
              />
            </div>

            {/* Template Type - Using exact select-dropdown values */}
            <div className="space-y-2">
              <Label>Template Type</Label>
              <Select
                value={formData.template_type}
                onValueChange={(value) =>
                  handleInputChange("template_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Newsletter">Newsletter</SelectItem>
                  <SelectItem value="Welcome Email">Welcome Email</SelectItem>
                  <SelectItem value="Promotional">Promotional</SelectItem>
                  <SelectItem value="Transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject Line with AI Generate Button */}
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <div className="flex space-x-2">
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Enter email subject line"
                  disabled={isLoading}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleGenerateSubject}
                  disabled={isGeneratingSubject || !formData.content.trim()}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3"
                  title="Generate subject from email content"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              {!formData.content.trim() && (
                <p className="text-xs text-gray-500">
                  Generate or add email content first to use AI subject
                  generation
                </p>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="active" className="text-base font-medium">
                  Active Template
                </Label>
                <p className="text-sm text-gray-600">
                  Active templates are available for creating campaigns
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) =>
                  handleInputChange("active", checked)
                }
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Template Content Section - 2 Column Layout */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Template Content</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Generate/Edit Content with AI */}
              <div className="space-y-6">
                {!hasGeneratedContent ? (
                  /* AI Generator Interface */
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-blue-800">
                        <Sparkles className="h-5 w-5" />
                        <span>Generate Content with AI</span>
                      </CardTitle>
                      <p className="text-blue-700 text-sm">
                        Describe what you want to create with Cosmic AI
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          ref={aiPromptRef}
                          placeholder="e.g., 'Create a welcome email for new customers joining our fitness app'"
                          value={aiPrompt}
                          onChange={(e) => {
                            setAIPrompt(e.target.value);
                            autoResize(e.target);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, "generate")}
                          onFocus={() => handleAISectionFocus(aiPromptRef)}
                          className="min-h-[100px] resize-none"
                          disabled={isAIGenerating}
                        />
                        <p className="text-xs text-blue-600">
                          💡 Tip: Press{" "}
                          <kbd className="px-1.5 py-0.5 text-xs bg-blue-200 rounded">
                            Cmd+Enter
                          </kbd>{" "}
                          to generate
                        </p>
                      </div>

                      {/* Context Items */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-blue-800">
                            Context (Optional)
                          </Label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              onClick={() => setShowContextInput(true)}
                              disabled={isAIGenerating}
                              size="sm"
                              variant="outline"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Context
                            </Button>
                          </div>
                        </div>

                        {/* Context Input */}
                        {showContextInput && (
                          <div className="p-3 border border-blue-200 rounded-lg bg-white">
                            <div className="flex space-x-2">
                              <Input
                                type="url"
                                value={contextUrl}
                                onChange={(e) => setContextUrl(e.target.value)}
                                placeholder="Enter media URL or webpage link..."
                                onKeyDown={(e) =>
                                  handleContextUrlKeyDown(e, false)
                                }
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                type="button"
                                onClick={() =>
                                  addContextItem(contextUrl, false)
                                }
                                disabled={!contextUrl.trim()}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  setShowContextInput(false);
                                  setContextUrl("");
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              📎 Add images, PDFs, documents, or web pages for
                              AI to analyze
                            </p>
                          </div>
                        )}

                        {/* Context Items List */}
                        {contextItems.length > 0 && (
                          <div className="space-y-2">
                            {contextItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded-md"
                              >
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  {getContextIcon(item)}
                                  <span className="text-sm text-blue-700 truncate">
                                    {item.title ||
                                      new URL(item.url).pathname
                                        .split("/")
                                        .pop() ||
                                      item.url}
                                  </span>
                                  <span className="text-xs text-blue-500 capitalize">
                                    ({item.type})
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    removeContextItem(item.id, false)
                                  }
                                  disabled={isAIGenerating}
                                  size="sm"
                                  variant="ghost"
                                  className="text-blue-400 hover:text-red-600 p-1"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* AI Status Display */}
                      {isAIGenerating && aiStatus && (
                        <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-blue-800">
                              {aiStatus}
                            </span>
                            <span className="text-xs text-blue-600">
                              {aiProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${aiProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleAIGenerate}
                        disabled={isAIGenerating || !aiPrompt.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isAIGenerating ? (
                          <>Generating with Cosmic AI...</>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate with Cosmic AI
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  /* AI Editor Interface */
                  <Card className="border-purple-200 bg-purple-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-purple-800">
                          <Wand2 className="h-5 w-5" />
                          <span>Edit Content with AI</span>
                        </div>
                        <Button
                          type="button"
                          onClick={resetToGenerate}
                          size="sm"
                          variant="outline"
                          className="text-gray-600 border-gray-300 hover:bg-gray-50"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                      </CardTitle>
                      <p className="text-purple-700 text-sm">
                        How should we improve the current content?
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Textarea
                          ref={editPromptRef}
                          placeholder="e.g., 'Add a call-to-action button', 'Change the tone to be more casual'"
                          value={editPrompt}
                          onChange={(e) => {
                            setEditPrompt(e.target.value);
                            autoResize(e.target);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, "edit")}
                          onFocus={() => handleAISectionFocus(editPromptRef)}
                          className="min-h-[100px] resize-none"
                          disabled={isAIEditing}
                        />
                        <p className="text-xs text-purple-600">
                          💡 Tip: Press{" "}
                          <kbd className="px-1.5 py-0.5 text-xs bg-purple-200 rounded">
                            Cmd+Enter
                          </kbd>{" "}
                          to edit
                        </p>
                      </div>

                      {/* Edit Context Items */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-purple-800">
                            Context (Optional)
                          </Label>
                          <Button
                            type="button"
                            onClick={() => setShowEditContextInput(true)}
                            disabled={isAIEditing}
                            size="sm"
                            variant="outline"
                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Context
                          </Button>
                        </div>

                        {/* Edit Context Input */}
                        {showEditContextInput && (
                          <div className="p-3 border border-purple-200 rounded-lg bg-white">
                            <div className="flex space-x-2">
                              <Input
                                type="url"
                                value={editContextUrl}
                                onChange={(e) =>
                                  setEditContextUrl(e.target.value)
                                }
                                placeholder="Enter style reference, brand guide, or example URL..."
                                onKeyDown={(e) =>
                                  handleContextUrlKeyDown(e, true)
                                }
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                type="button"
                                onClick={() =>
                                  addContextItem(editContextUrl, true)
                                }
                                disabled={!editContextUrl.trim()}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  setShowEditContextInput(false);
                                  setEditContextUrl("");
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs text-purple-600 mt-2">
                              📎 Add style guides, brand references, or examples
                              for AI to follow
                            </p>
                          </div>
                        )}

                        {/* Edit Context Items List */}
                        {editContextItems.length > 0 && (
                          <div className="space-y-2">
                            {editContextItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 bg-white border border-purple-200 rounded-md"
                              >
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  {getContextIcon(item)}
                                  <span className="text-sm text-purple-700 truncate">
                                    {item.title ||
                                      new URL(item.url).pathname
                                        .split("/")
                                        .pop() ||
                                      item.url}
                                  </span>
                                  <span className="text-xs text-purple-500 capitalize">
                                    ({item.type})
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    removeContextItem(item.id, true)
                                  }
                                  disabled={isAIEditing}
                                  size="sm"
                                  variant="ghost"
                                  className="text-purple-400 hover:text-red-600 p-1"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* AI Edit Status Display */}
                      {isAIEditing && aiStatus && (
                        <div className="p-3 bg-purple-100 border border-purple-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-purple-800">
                              {aiStatus}
                            </span>
                            <span className="text-xs text-purple-600">
                              {aiProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-purple-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${aiProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleAIEdit}
                        disabled={isAIEditing || !editPrompt.trim()}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isAIEditing ? (
                          <>Editing with AI...</>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Edit with AI
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Template Content with Toolbar */}
              <div className="space-y-4">
                <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <strong>Subject:</strong>{" "}
                        {formData.subject || "No subject"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formData.template_type}
                      </div>
                    </div>
                  </div>

                  {/* Sticky formatting toolbar */}
                  <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200 z-10">
                    <HtmlEditingToolbar
                      onFormatApply={handleFormatApply}
                      className=""
                      primaryColor={
                        settings?.metadata?.primary_brand_color || "#3b82f6"
                      }
                    />
                  </div>

                  <div className="p-4 max-h-80 overflow-y-auto">
                    <div
                      ref={previewRef}
                      className="prose max-w-none text-sm cursor-text"
                      contentEditable={!isAIGenerating && !isAIEditing}
                      style={{
                        pointerEvents:
                          isAIGenerating || isAIEditing ? "none" : "auto",
                        userSelect:
                          isAIGenerating || isAIEditing ? "none" : "text",
                        outline: "none",
                        minHeight: "200px",
                      }}
                      onInput={(e) => {
                        // Update content in real-time for AI to see changes
                        const updatedContent = e.currentTarget.innerHTML;
                        setFormData((prev) => ({
                          ...prev,
                          content: updatedContent,
                        }));
                      }}
                    />
                    {/* Preview unsubscribe footer */}
                    {formData.content && (
                      <div className="mt-6 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
                        <p>
                          You received this email because you subscribed to our
                          mailing list.
                          <br />
                          <span className="underline cursor-pointer">
                            Unsubscribe
                          </span>{" "}
                          from future emails.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          ↑ This unsubscribe link will be added automatically to
                          all campaign emails
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">✨ Enhanced Editing</p>
                      <p className="text-xs">
                        {isAIGenerating || isAIEditing ? (
                          <span className="text-purple-700 font-medium">
                            AI is processing content...
                          </span>
                        ) : (
                          <>
                            Ready to edit! Type directly in the content area and
                            select text to use the formatting toolbar.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link Dialog */}
      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => {
          setShowLinkDialog(false);
          setLinkDialogData({ url: "", text: "" });
        }}
        onSave={handleLinkSave}
        onVisit={handleVisitLink}
        initialUrl={linkDialogData.url}
        initialText={linkDialogData.text}
      />
    </>
  );
}
