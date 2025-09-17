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

  // CRITICAL: Enhanced content sync with immediate state updates
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

  // CRITICAL: Enhanced immediate content sync function
  const syncContentToState = (content: string) => {
    // Clear any existing timeout for batched updates
    if (contentSyncTimeoutRef.current) {
      clearTimeout(contentSyncTimeoutRef.current);
    }

    // CRITICAL: Immediate update for image and link operations
    if (!isUpdatingFromStateRef.current) {
      onContentChange(content);
    }

    // Also set a short timeout for any additional rapid changes
    contentSyncTimeoutRef.current = setTimeout(() => {
      if (!isUpdatingFromStateRef.current) {
        onContentChange(content);
      }
    }, 50); // Reduced from 100ms to 50ms for faster response
  };

  // ENHANCED: Handle format application with immediate content sync
  const handleFormatApply = (format: string, value?: string) => {
    const previewDiv = mainPreviewRef.current;
    if (!previewDiv) return;

    // Mark main editor as active to prevent conflicts
    setActiveEditor("main");

    try {
      // Save cursor position before applying format
      saveCursorPosition();

      // Apply formatting directly to the contentEditable div
      applyFormat(previewDiv, format, value, primaryColor);

      // CRITICAL: Get updated content and sync immediately
      const updatedContent = previewDiv.innerHTML;
      
      // Immediate state update for toolbar operations
      syncContentToState(updatedContent);

      // Restore cursor position after formatting
      setTimeout(() => {
        restoreCursorPosition();
      }, 10);
    } catch (error) {
      console.error("Format application error:", error);
    } finally {
      // Clear active editor after a brief delay
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

  // CRITICAL: Enhanced contentEditable input handler with immediate sync
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

    // CRITICAL: Immediate sync for all content changes
    syncContentToState(updatedContent);

    // Clear active editor after state update
    setTimeout(() => {
      setActiveEditor(null);
    }, 100);
  };

  // CRITICAL: Enhanced content change event handler for toolbar operations
  useEffect(() => {
    const handleContentChanged = (event: CustomEvent) => {
      const { content: newContent } = event.detail;
      if (newContent && newContent !== content) {
        // Immediate sync for toolbar operations
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

  // CRITICAL: Add blur event to ensure final content sync
  const handleContentEditableBlur = () => {
    if (mainPreviewRef.current) {
      const finalContent = mainPreviewRef.current.innerHTML;
      syncContentToState(finalContent);
    }
  };

  // CRITICAL: Enhanced DOM mutation observer for immediate sync
  useEffect(() => {
    if (!mainPreviewRef.current) return;

    const observer = new MutationObserver((mutations) => {
      // Only sync if we're not in the middle of a state update
      if (!isUpdatingFromStateRef.current && mainPreviewRef.current) {
        const currentContent = mainPreviewRef.current.innerHTML;
        
        // Check if the mutation was due to image or link operations
        const hasImageOrLinkChanges = mutations.some(mutation => {
          return Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).tagName &&
            ['IMG', 'A'].includes((node as Element).tagName)
          ) || Array.from(mutation.removedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).tagName &&
            ['IMG', 'A'].includes((node as Element).tagName)
          );
        });

        // If image or link changes detected, sync immediately
        if (hasImageOrLinkChanges) {
          syncContentToState(currentContent);
        }
      }
    });

    observer.observe(mainPreviewRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'alt', 'href', 'style'],
    });

    return () => observer.disconnect();
  }, []);

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
            onBlur={handleContentEditableBlur}
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
                    left for intelligent content changes. All changes are saved automatically.
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