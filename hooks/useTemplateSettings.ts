import { useState, useEffect } from "react";
import { Settings } from "@/types";

/**
 * Hook for managing template settings (primarily for primary brand color)
 * Consolidates the settings fetching logic used in both Create and Edit template forms
 */
export function useTemplateSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        } else {
          throw new Error("Failed to fetch settings");
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch settings"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Derived values for convenience
  const primaryColor = settings?.metadata?.primary_brand_color || "#3b82f6";

  return {
    settings,
    primaryColor,
    isLoading,
    error,
  };
}
