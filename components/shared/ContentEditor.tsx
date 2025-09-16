"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import HtmlEditingToolbar from "@/components/HtmlEditingToolbar";
import { Info, Maximize } from "lucide-react";
import { applyFormat, applyStylesToContent } from "@/utils/htmlFormatting";
import { useTemplateSettings } from "@/hooks/useTemplateSettings";

interface ContentEditorProps {
  content: string;
  subject: string;
  templateType?: string;
  isAIEditing?: boolean;
  streamingContent?: string;
  onContentChange: (content: string) => void;
  onPreview?: () => void;
  showPreviewButton?: boolean;
  className?: string;
}

export default function ContentEditor({
  content,
  subject,
  templateType,
  isAIEditing = false,
  streamingContent = "",
  onContentChange,
  onPreview,
  showPreviewButton = false,
  className = "",
}: ContentEditorProps) {
  const mainPreviewRef = useRef<HTMLDivElement>(null);
  const { primaryColor } = useTemplateSettings();

  // Track which editor is currently being used to prevent conflicts
  const [activeEditor, setActiveEditor] = useState<"main" | null>(null);

  // CRITICAL: Add content sync timeout to ensure all changes are captured
  const contentSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromStateRef = useRef<boolean>(false);
  const cursorPositionRef = useRef<{
    selection: Selection | null;
    range: Range | null;
  }>({ selection: null, range: null });

  // Save current cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPositionRef.current = {
        selection: selection,
        range: range.cloneRange(),
      };
    }
  };

  // Restore cursor position
  const restoreCursorPosition = () => {
    const { selection, range } = cursorPositionRef.current;
    if (selection && range) {
      try {
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (error) {
        // Ignore errors if range is no longer valid
        console.warn("Could not restore cursor position:", error);
      }
    }
  };

  // CRITICAL: Enhanced content sync function to ensure all changes are captured
  const syncContentToState = (content: string) => {
    // Clear any existing timeout
    if (contentSyncTimeoutRef.current) {
      clearTimeout(contentSyncTimeoutRef.current);
    }

    // Set a short timeout to batch rapid changes
    contentSyncTimeoutRef.current = setTimeout(() => {
      // Double check that we're not in a state update cycle
      if (!isUpdatingFromStateRef.current) {
        onContentChange(content);
      }
    }, 100); // 100ms for better debouncing
  };

  // FIXED: Handle format application from toolbar with proper conflict prevention and content sync
  const handleFormatApply = (format: string, value?: string) => {
    const previewDiv = mainPreviewRef.current;
    if (!previewDiv) return;

    // Mark main editor as active to prevent conflicts
    setActiveEditor("main");

    try {
      // Apply formatting directly to the contentEditable div
      applyFormat(previewDiv, format, value, primaryColor);

      // Get the updated content and sync with React state immediately
      const updatedContent = previewDiv.innerHTML;

      // CRITICAL: Use the enhanced sync function for immediate state update
      syncContentToState(updatedContent);
    } catch (error) {
      console.error("Format application error:", error);
    } finally {
      // Clear active editor after a brief delay to allow for proper state sync
      setTimeout(() => {
        setActiveEditor(null);
      }, 100);
    }
  };

  // Initialize content in contentEditable div
  useEffect(() => {
    if (mainPreviewRef.current && !isUpdatingFromStateRef.current) {
      const currentMainContent = mainPreviewRef.current.innerHTML;
      const expectedContent = isAIEditing
        ? streamingContent
        : content || "<p>Start typing your email content here...</p>";

      // Only update if content is actually different and we're not actively editing
      if (
        currentMainContent !== expectedContent &&
        activeEditor !== "main" &&
        document.activeElement !== mainPreviewRef.current
      ) {
        // Save cursor position before updating
        const wasActive = document.activeElement === mainPreviewRef.current;
        if (wasActive) {
          saveCursorPosition();
        }

        isUpdatingFromStateRef.current = true;
        mainPreviewRef.current.innerHTML = expectedContent;
        applyStylesToContent(mainPreviewRef.current, primaryColor);

        // Restore cursor position after update
        if (wasActive) {
          setTimeout(() => {
            restoreCursorPosition();
            isUpdatingFromStateRef.current = false;
          }, 0);
        } else {
          isUpdatingFromStateRef.current = false;
        }
      }
    }
  }, [content, streamingContent, isAIEditing, primaryColor, activeEditor]);

  // ENHANCED: ContentEditable input handler with better content sync
  const handleContentEditableInput = (e: React.FormEvent<HTMLDivElement>) => {
    // Prevent recursive updates
    if (isUpdatingFromStateRef.current) {
      return;
    }

    // Set main editor as active to prevent conflicts
    setActiveEditor("main");

    // Save cursor position before any state changes
    saveCursorPosition();

    const updatedContent = e.currentTarget.innerHTML;

    // CRITICAL: Use enhanced sync function for immediate state update
    syncContentToState(updatedContent);

    // Clear active editor after state update
    setTimeout(() => {
      setActiveEditor(null);
    }, 100);
  };

  // ENHANCED: Handle content change events from toolbar operations
  useEffect(() => {
    const handleContentChanged = (event: CustomEvent) => {
      const { content: newContent } = event.detail;
      if (newContent && newContent !== content) {
        syncContentToState(newContent);
      }
    };

    if (mainPreviewRef.current) {
      mainPreviewRef.current.addEventListener(
        "contentChanged",
        handleContentChanged as EventListener
      );
    }

    return () => {
      if (mainPreviewRef.current) {
        mainPreviewRef.current.removeEventListener(
          "contentChanged",
          handleContentChanged as EventListener
        );
      }
    };
  }, [content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (contentSyncTimeoutRef.current) {
        clearTimeout(contentSyncTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`space-y-4 lg:col-span-2 ${className}`}>
      <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Subject:</strong> {subject || "No subject"}
            </div>
            <div className="flex items-center space-x-2">
              {templateType && (
                <div className="text-xs text-gray-500">{templateType}</div>
              )}
              {isAIEditing && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-purple-600">AI Editing...</span>
                </div>
              )}
              {showPreviewButton && onPreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onPreview}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Maximize className="h-4 w-4" />
                  <span>Preview</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sticky formatting toolbar */}
        <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200 z-10">
          <HtmlEditingToolbar
            onFormatApply={handleFormatApply}
            className=""
            primaryColor={primaryColor}
          />
        </div>

        <div className="p-4 min-h-96 max-h-[600px] overflow-y-auto">
          <div
            ref={mainPreviewRef}
            className="prose max-w-none text-sm cursor-text"
            contentEditable={!isAIEditing}
            data-editor-instance="main"
            style={{
              pointerEvents: isAIEditing ? "none" : "auto",
              userSelect: isAIEditing ? "none" : "text",
              outline: "none",
              minHeight: "200px",
            }}
            onInput={handleContentEditableInput}
            suppressContentEditableWarning={true}
          />
          {/* Preview unsubscribe footer */}
          {(content || streamingContent) && (
            <div className="mt-6 pt-3 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>
                You received this email because you subscribed to our mailing
                list.
                <br />
                <span className="underline cursor-pointer">
                  Unsubscribe
                </span>{" "}
                from future emails.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ↑ This unsubscribe link will be added automatically to all
                campaign emails
              </p>
            </div>
          )}
        </div>
      </div>
      {(content || streamingContent) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">✨ Enhanced Editing</p>
              <p className="text-xs">
                {isAIEditing ? (
                  <span className="text-purple-700 font-medium">
                    AI is editing content...
                  </span>
                ) : (
                  <>
                    Ready to edit! Type directly in the content area and select
                    text to use the formatting toolbar. Use AI editor on the
                    left for intelligent content changes.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
