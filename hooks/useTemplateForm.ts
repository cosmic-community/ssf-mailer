import { useState, useCallback } from "react";
import { TemplateType } from "@/types";

interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
  template_type: TemplateType;
  active: boolean;
}

interface UseTemplateFormOptions {
  initialData?: Partial<TemplateFormData>;
  onSubmit?: (data: TemplateFormData) => Promise<void>;
}

/**
 * Hook for managing template form state and validation
 * Consolidates form management logic used in both Create and Edit template forms
 */
export function useTemplateForm({
  initialData = {},
  onSubmit,
}: UseTemplateFormOptions = {}) {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    subject: "",
    content: "",
    template_type: "Newsletter",
    active: true,
    ...initialData,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Update individual field
  const updateField = useCallback(
    <K extends keyof TemplateFormData>(
      field: K,
      value: TemplateFormData[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when user starts making changes
      if (error) setError("");
    },
    [error]
  );

  // Update multiple fields at once
  const updateFields = useCallback(
    (updates: Partial<TemplateFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
      if (error) setError("");
    },
    [error]
  );

  // Validation
  const validate = useCallback(() => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push("Template name is required");
    }

    if (!formData.subject.trim()) {
      errors.push("Subject line is required");
    }

    if (!formData.content.trim()) {
      errors.push("Content is required");
    }

    return errors;
  }, [formData]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return false;
    }

    if (!onSubmit) return false;

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      await onSubmit(formData);
      setSuccess("Template saved successfully!");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validate, onSubmit]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      subject: "",
      content: "",
      template_type: "Newsletter",
      active: true,
      ...initialData,
    });
    setError("");
    setSuccess("");
  }, [initialData]);

  // Check if form is valid
  const isValid = validate().length === 0;

  return {
    formData,
    updateField,
    updateFields,
    handleSubmit,
    resetForm,
    isSubmitting,
    error,
    success,
    isValid,
    setError,
    setSuccess,
  };
}
