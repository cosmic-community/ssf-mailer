import { useRef, useEffect, useCallback } from "react";
import { applyFormat, applyStylesToContent } from "@/utils/htmlFormatting";

interface UseContentEditorOptions {
  content: string;
  primaryColor: string;
  onContentChange: (content: string) => void;
  disabled?: boolean;
}

/**
 * Hook for managing contentEditable areas with toolbar integration
 * Consolidates the content editing logic used in both Create and Edit template forms
 */
export function useContentEditor({
  content,
  primaryColor,
  onContentChange,
  disabled = false,
}: UseContentEditorOptions) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize content in contentEditable div
  useEffect(() => {
    if (contentRef.current && !contentRef.current.innerHTML && content) {
      contentRef.current.innerHTML =
        content || "<p>Start typing your email content here...</p>";
      applyStylesToContent(contentRef.current, primaryColor);
    }
  }, [content, primaryColor]);

  // Update contentEditable div when content changes externally (like from AI)
  useEffect(() => {
    if (
      contentRef.current &&
      contentRef.current.innerHTML !== content &&
      document.activeElement !== contentRef.current
    ) {
      // Only update if the content is different and we're not currently typing
      contentRef.current.innerHTML =
        content || "<p>Start typing your email content here...</p>";
      applyStylesToContent(contentRef.current, primaryColor);
    }
  }, [content, primaryColor]);

  // Handle format application from toolbar
  const handleFormatApply = useCallback(
    (format: string, value?: string) => {
      const contentDiv = contentRef.current;
      if (!contentDiv || disabled) return;

      const currentContent = contentDiv.innerHTML;

      // Apply formatting directly to the contentEditable div
      const updatedContent = applyFormat(
        contentDiv,
        format,
        value,
        primaryColor
      );

      // Update parent component if content changed
      if (updatedContent !== currentContent) {
        onContentChange(updatedContent);
      }
    },
    [primaryColor, onContentChange, disabled]
  );

  // Handle input changes
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const updatedContent = e.currentTarget.innerHTML;
      onContentChange(updatedContent);
    },
    [onContentChange]
  );

  // Content editor props that can be spread onto a contentEditable div
  const contentEditableProps = {
    ref: contentRef,
    className: "prose max-w-none text-sm cursor-text",
    contentEditable: !disabled,
    style: {
      pointerEvents: disabled ? ("none" as const) : ("auto" as const),
      userSelect: disabled ? ("none" as const) : ("text" as const),
      outline: "none",
      minHeight: "200px",
    },
    onInput: handleInput,
  };

  return {
    contentRef,
    handleFormatApply,
    contentEditableProps,
  };
}
