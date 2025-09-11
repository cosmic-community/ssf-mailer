/**
 * EXAMPLE: How the consolidated hooks would simplify template forms
 * This shows how both Create and Edit forms could be dramatically simplified
 *
 * NOTE: This is just an example - not meant to replace existing forms yet
 */

"use client";

import { useTemplateSettings } from "@/hooks/useTemplateSettings";
import { useContentEditor } from "@/hooks/useContentEditor";
import { useSelectionManager } from "@/hooks/useSelectionManager";
import { useTemplateForm } from "@/hooks/useTemplateForm";
import { HtmlEditingToolbar } from "@/components/HtmlEditingToolbar";
import { LinkDialog } from "@/components/shared/LinkDialog";
import { useState } from "react";

interface ConsolidatedTemplateFormProps {
  mode: "create" | "edit";
  initialData?: any; // Would be EmailTemplate for edit mode
}

export function ConsolidatedTemplateForm({
  mode,
  initialData,
}: ConsolidatedTemplateFormProps) {
  // 🎯 All the complex logic is now in reusable hooks!
  const { settings, primaryColor } = useTemplateSettings();

  const { formData, updateField, handleSubmit, isSubmitting, error, isValid } =
    useTemplateForm({
      initialData:
        mode === "edit"
          ? {
              name: initialData?.metadata.name,
              subject: initialData?.metadata.subject,
              content: initialData?.metadata.content,
              template_type: initialData?.metadata.template_type.value,
              active: initialData?.metadata.active,
            }
          : undefined,
      onSubmit: async (data) => {
        const endpoint =
          mode === "create"
            ? "/api/templates"
            : `/api/templates/${initialData.id}`;
        const method = mode === "create" ? "POST" : "PUT";

        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to ${mode} template`);
        }
      },
    });

  const { contentRef, handleFormatApply, contentEditableProps } =
    useContentEditor({
      content: formData.content,
      primaryColor,
      onContentChange: (content) => updateField("content", content),
    });

  const {
    saveCurrentSelection,
    restoreSelection,
    clearSelection,
    hasValidSelection,
  } = useSelectionManager();

  // Link dialog state (much simpler now!)
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkData, setLinkData] = useState({ url: "", text: "" });

  const handleAddLink = () => {
    if (!hasValidSelection()) return;

    const { selectedText } = saveCurrentSelection();
    setLinkData({ url: "", text: selectedText });
    setShowLinkDialog(true);
  };

  const handleLinkSave = (url: string, text: string) => {
    restoreSelection();
    // Link creation logic would go here
    clearSelection();
    setShowLinkDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Template Details Form - could be its own component */}
      <div className="space-y-4">
        <input
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Template name"
        />
        <input
          value={formData.subject}
          onChange={(e) => updateField("subject", e.target.value)}
          placeholder="Subject line"
        />
      </div>

      {/* Content Editor - dramatically simplified! */}
      <div className="border rounded-lg overflow-hidden">
        <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b">
          <HtmlEditingToolbar
            onFormatApply={handleFormatApply}
            primaryColor={primaryColor}
            onAddLink={handleAddLink}
          />
        </div>

        <div className="p-4">
          <div {...contentEditableProps} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !isValid}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : mode === "create"
            ? "Create Template"
            : "Update Template"}
        </button>
      </div>

      {/* Link Dialog */}
      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSave={handleLinkSave}
        initialUrl={linkData.url}
        initialText={linkData.text}
      />

      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}

/**
 * 🎉 BENEFITS OF THIS APPROACH:
 *
 * 1. ✅ MASSIVE CODE REDUCTION:
 *    - CreateTemplateForm: ~1900 lines → ~200 lines
 *    - EditTemplateForm: ~1100 lines → ~200 lines
 *    - Total: ~3000 lines → ~400 lines + reusable hooks
 *
 * 2. ✅ SINGLE SOURCE OF TRUTH:
 *    - Settings logic: 1 place instead of 2
 *    - Content editing: 1 place instead of 2
 *    - Selection management: 1 place instead of 2
 *    - Form validation: 1 place instead of 2
 *
 * 3. ✅ EASIER TESTING:
 *    - Each hook can be tested in isolation
 *    - Business logic separated from UI
 *    - Mock-friendly architecture
 *
 * 4. ✅ BETTER MAINTAINABILITY:
 *    - Bug fixes in one place benefit both forms
 *    - New features added once, available everywhere
 *    - Clear separation of concerns
 *
 * 5. ✅ REUSABILITY:
 *    - Hooks can be used in other template-related components
 *    - LinkDialog can be used anywhere in the app
 *    - Content editor can power other rich text areas
 */
