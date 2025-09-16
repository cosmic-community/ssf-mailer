"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailTemplate, TemplateType, Settings } from "@/types";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  X,
  FileText,
  Image,
  File,
  Plus,
  Globe,
  Wand2,
  Maximize,
  Minimize,
} from "lucide-react";
import ConfirmationModal from "@/components/ConfirmationModal";
import ContentEditor from "./shared/ContentEditor";
import { useToast } from "@/hooks/useToast";
import { useTemplateSettings } from "@/hooks/useTemplateSettings";

interface ContextItem {
  id: string;
  url: string;
  type: "file" | "webpage";
  status: "pending" | "analyzing" | "ready" | "error";
  title?: string;
  error?: string;
}

interface EditTemplateFormProps {
  template: EmailTemplate;
}

export default function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAIEditing, setIsAIEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSessionActive, setEditingSessionActive] = useState(false);
  const { addToast } = useToast();

  // Simple editing states - start in view mode
  const [isMainEditing, setIsMainEditing] = useState(false);

  // Full screen state
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Use shared settings hook
  const { settings, primaryColor } = useTemplateSettings();

  // Context items state for AI editing
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextUrl, setContextUrl] = useState("");

  // Refs for autofocus and auto-resize
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Form state - SINGLE SOURCE OF TRUTH
  const [formData, setFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value as TemplateType,
    active: template.metadata.active,
  });

  // Store original template data for reset functionality and change tracking
  const [originalFormData, setOriginalFormData] = useState({
    name: template.metadata.name,
    subject: template.metadata.subject,
    content: template.metadata.content,
    template_type: template.metadata.template_type.value as TemplateType,
    active: template.metadata.active,
  });

  // Track if form has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form has changes
  const hasFormChanges = () => {
    return (
      formData.name !== originalFormData.name ||
      formData.subject !== originalFormData.subject ||
      formData.content !== originalFormData.content ||
      formData.template_type !== originalFormData.template_type ||
      formData.active !== originalFormData.active
    );
  };

  // Update unsaved changes state whenever form data changes
  useEffect(() => {
    setHasUnsavedChanges(hasFormChanges() && !isSubmitting);
  }, [formData, isSubmitting]);

  // Prevent navigation away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const originalPush = router.push;
    const originalBack = router.back;
    const originalReplace = router.replace;

    router.push = (...args) => {
      if (hasUnsavedChanges && !isSubmitting) {
        const confirmed = window.confirm(
          "You have unsaved changes. Are you sure you want to leave?"
        );
        if (!confirmed) return Promise.resolve(true);
      }
      return originalPush.apply(router, args);
    };

    router.back = () => {
      if (hasUnsavedChanges && !isSubmitting) {
        const confirmed = window.confirm(
          "You have unsaved changes. Are you sure you want to leave?"
        );
        if (!confirmed) return;
      }
      return originalBack.apply(router);
    };

    router.replace = (...args) => {
      if (hasUnsavedChanges && !isSubmitting) {
        const confirmed = window.confirm(
          "You have unsaved changes. Are you sure you want to leave?"
        );
        if (!confirmed) return Promise.resolve(true);
      }
      return originalReplace.apply(router, args);
    };

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.push = originalPush;
      router.back = originalBack;
      router.replace = originalReplace;
    };
  }, [hasUnsavedChanges, isSubmitting, router]);

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  // Handle keyboard shortcuts for AI prompt textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleAIEdit();
    }
  };

  // Handle full screen toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Handle ESC key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    if (isFullScreen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullScreen]);

  // Set up auto-resize for textareas
  useEffect(() => {
    const textareas = [aiPromptRef.current, contentRef.current].filter(
      Boolean
    ) as HTMLTextAreaElement[];

    textareas.forEach((textarea) => {
      const handleInput = () => autoResize(textarea);
      textarea.addEventListener("input", handleInput);
      autoResize(textarea);
      return () => textarea.removeEventListener("input", handleInput);
    });
  }, []);

  // Handle content change from shared editor
  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  };

  // Auto-focus AI prompt when AI section is shown
  const handleAISectionFocus = () => {
    setTimeout(() => {
      if (aiPromptRef.current) {
        aiPromptRef.current.focus();
      }
    }, 100);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleReset = () => {
    setFormData(originalFormData);
    setError("");
    setSuccess("");

    setTimeout(() => {
      if (contentRef.current) {
        autoResize(contentRef.current);
      }
    }, 100);
  };

  const detectContentType = (url: string): "file" | "webpage" => {
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

    if (
      url.includes("cdn.cosmicjs.com") ||
      url.includes("/uploads/") ||
      url.includes("/files/")
    ) {
      return "file";
    }

    return "webpage";
  };

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

  const addContextItem = (url: string) => {
    if (!url.trim()) return;

    const newItem: ContextItem = {
      id: Date.now().toString(),
      url: url.trim(),
      type: detectContentType(url.trim()),
      status: "pending",
    };

    setContextItems((prev) => [...prev, newItem]);
    setContextUrl("");
    setShowContextInput(false);
  };

  const removeContextItem = (id: string) => {
    setContextItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleContextUrlKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addContextItem(contextUrl);
    } else if (e.key === "Escape") {
      setShowContextInput(false);
      setContextUrl("");
    }
  };

  const handleAIEdit = async () => {
    if (!aiPrompt.trim()) {
      setError("Please provide instructions for AI editing");
      return;
    }

    if (!template.id) {
      setError("Template ID is missing");
      return;
    }

    setIsAIEditing(true);
    setEditingSessionActive(true);
    setError("");
    setSuccess("");
    setStreamingContent("");
    setAiStatus("Starting AI editing...");
    setAiProgress(0);

    try {
      const requestBody = {
        templateId: template.id,
        currentContent: formData.content,
        currentSubject: formData.subject,
        prompt: aiPrompt,
        context_items: contextItems.filter(
          (item) => item.status === "ready" || item.status === "pending"
        ),
      };

      const response = await fetch("/api/templates/edit-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to start AI editing");
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

                  // CRITICAL: Update form data during streaming but prevent editor conflicts
                  // Don't set activeEditor to 'ai' as it's not part of the valid union type
                  setFormData((prev) => ({
                    ...prev,
                    content: accumulatedContent,
                  }));
                } else if (data.type === "complete") {
                  // Final update with complete content
                  const finalContent = data.data.content;
                  const finalSubject = data.data.subject || formData.subject;

                  setFormData((prev) => ({
                    ...prev,
                    content: finalContent,
                    subject: finalSubject,
                  }));

                  setAiStatus("Editing complete!");
                  setAiProgress(100);
                  setSuccess("Template updated with AI suggestions!");
                  addToast("AI editing completed successfully!", "success");

                  setAiPrompt("");

                  setTimeout(() => {
                    if (contentRef.current) {
                      autoResize(contentRef.current);
                    }
                    if (aiPromptRef.current) {
                      aiPromptRef.current.focus();
                    }
                  }, 100);

                  setTimeout(() => {
                    setSuccess(
                      "Ready for more edits! Add another instruction or save template."
                    );
                  }, 2000);
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
      console.error("AI edit error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to edit template with AI"
      );
      setAiStatus("Editing failed");
      setEditingSessionActive(false);
    } finally {
      setIsAIEditing(false);
      setTimeout(() => {
        setAiStatus("");
        setAiProgress(0);
      }, 2000);
    }
  };

  const endEditingSession = () => {
    setEditingSessionActive(false);
    setAiPrompt("");
    setContextItems([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Template name is required");
      return;
    }

    if (!formData.subject.trim()) {
      setError("Subject line is required");
      return;
    }

    if (!formData.content.trim()) {
      setError("Email content is required");
      return;
    }

    if (!template.id) {
      setError("Template ID is missing");
      return;
    }

    // Content is already synced via the shared ContentEditor

    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/templates/${template.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            subject: formData.subject.trim(),
            content: formData.content,
            template_type: formData.template_type,
            active: formData.active,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update template");
        }

        const finalContent = formData.content;

        setOriginalFormData({
          name: formData.name.trim(),
          subject: formData.subject.trim(),
          content: finalContent,
          template_type: formData.template_type,
          active: formData.active,
        });

        setHasUnsavedChanges(false);
        setSuccess("Template updated successfully!");
        addToast("Template updated successfully!", "success");
        setEditingSessionActive(false);
      } catch (error) {
        console.error("Update error:", error);
        setError(
          error instanceof Error ? error.message : "Failed to update template"
        );
        addToast(
          error instanceof Error ? error.message : "Failed to update template",
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleDeleteConfirm = async () => {
    if (!template.id) {
      setError("Template ID is missing");
      return;
    }

    setIsDeleting(true);
    setShowDeleteModal(false);

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete template");
      }

      router.push("/templates");
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete template"
      );
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (editingSessionActive) {
      endEditingSession();
      return;
    }

    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }
    router.back();
  };

  // Simple read-only full-screen preview modal
  const FullScreenPreview = () => (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={toggleFullScreen}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Email Preview
            </h2>
            <p className="text-sm text-gray-600">
              <strong>Subject:</strong> {formData.subject || "No subject"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={toggleFullScreen}
            size="sm"
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: formData.content || "<p>No content to preview</p>",
            }}
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              lineHeight: "1.6",
              color: "#333333",
            }}
          />

          {/* Unsubscribe footer preview */}
          {formData.content && (
            <div className="mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                You are receiving this email because you subscribed to our
                newsletter.{" "}
                <a href="#" className="text-blue-600 underline">
                  Unsubscribe
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Full Screen Overlay */}
      {isFullScreen && <FullScreenPreview />}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-amber-700">
            You have unsaved changes. Make sure to save your template before
            leaving this page.
          </p>
        </div>
      )}

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
                disabled={isPending}
                size="sm"
              >
                {editingSessionActive ? "End Editing" : "Cancel"}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-slate-800 hover:bg-slate-900 text-white"
                size="sm"
              >
                {isPending ? "Updating..." : "Update Template"}
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
              disabled={isPending}
              required
            />
          </div>

          {/* Template Type */}
          <div className="space-y-2">
            <Label htmlFor="template_type">Template Type</Label>
            <Select
              value={formData.template_type}
              onValueChange={(value) =>
                handleInputChange("template_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Welcome Email">Welcome Email</SelectItem>
                <SelectItem value="Newsletter">Newsletter</SelectItem>
                <SelectItem value="Promotional">Promotional</SelectItem>
                <SelectItem value="Transactional">Transactional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              placeholder="Enter email subject line"
              disabled={isPending}
              required
            />
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
              disabled={isPending}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Edit Content with AI - 1/3 width */}
            <div className="space-y-6 lg:col-span-1">
              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-purple-800">
                    <Wand2 className="h-5 w-5" />
                    <span>Edit Content with AI</span>
                  </CardTitle>
                  <p className="text-purple-700 text-sm">
                    How should we improve the current content?
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      ref={aiPromptRef}
                      placeholder="e.g., 'Add a call-to-action button', 'Change the tone to be more casual'"
                      value={aiPrompt}
                      onChange={(e) => {
                        setAiPrompt(e.target.value);
                        autoResize(e.target);
                      }}
                      onKeyDown={handleKeyDown}
                      onFocus={handleAISectionFocus}
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

                  {/* Context Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-purple-800">
                        Context (Optional)
                      </Label>
                      <Button
                        type="button"
                        onClick={() => setShowContextInput(true)}
                        disabled={isAIEditing}
                        size="sm"
                        variant="outline"
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Context
                      </Button>
                    </div>

                    {/* Context Input */}
                    {showContextInput && (
                      <div className="p-3 border border-purple-200 rounded-lg bg-white">
                        <div className="flex space-x-2">
                          <Input
                            type="url"
                            value={contextUrl}
                            onChange={(e) => setContextUrl(e.target.value)}
                            placeholder="Enter style reference, brand guide, or example URL..."
                            onKeyDown={handleContextUrlKeyDown}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            type="button"
                            onClick={() => addContextItem(contextUrl)}
                            disabled={!contextUrl.trim()}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
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
                        <p className="text-xs text-purple-600 mt-2">
                          📎 Add style guides, brand references, or web pages
                          for AI to follow
                        </p>
                      </div>
                    )}

                    {/* Context Items List */}
                    {contextItems.length > 0 && (
                      <div className="space-y-2">
                        {contextItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-white border border-purple-200 rounded-md"
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {getContextIcon(item)}
                              <span className="text-sm text-purple-700 truncate">
                                {item.title ||
                                  new URL(item.url).pathname.split("/").pop() ||
                                  item.url}
                              </span>
                              <span className="text-xs text-purple-500 capitalize">
                                ({item.type})
                              </span>
                            </div>
                            <Button
                              type="button"
                              onClick={() => removeContextItem(item.id)}
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

                    <p className="text-xs text-purple-600">
                      📎 AI will use context items as reference for improvements
                    </p>
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
                    disabled={isAIEditing || !aiPrompt.trim()}
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

                  {/* Editing session help */}
                  {editingSessionActive && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">
                            Iterative Editing Mode
                          </p>
                          <p className="text-xs">
                            Keep adding refinement instructions to perfect your
                            template. Context and previous changes are
                            preserved.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Template Content with Toolbar - 2/3 width */}
            <ContentEditor
              content={formData.content}
              subject={formData.subject}
              templateType={formData.template_type}
              isAIEditing={isAIEditing}
              streamingContent={streamingContent}
              onContentChange={handleContentChange}
              onPreview={toggleFullScreen}
              showPreviewButton={true}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Template Section */}
      <div className="border-t pt-8 mt-8">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Danger Zone</span>
            </CardTitle>
            <p className="text-red-700 text-sm">
              Permanently delete this email template. This action cannot be
              undone.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Template</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Template"
        message={`Are you sure you want to delete "${formData.name}"? This action cannot be undone and will permanently remove this template from your account.`}
        confirmText="Delete Template"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
