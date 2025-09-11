import { useState, useCallback } from "react";

interface SavedSelection {
  range: Range | null;
  selection: string;
}

/**
 * Hook for managing text selections in contentEditable areas
 * Consolidates selection save/restore logic used for link creation
 */
export function useSelectionManager() {
  const [savedSelection, setSavedSelection] = useState<SavedSelection | null>(
    null
  );

  const saveCurrentSelection = useCallback(() => {
    const selection = window.getSelection();
    let range: Range | null = null;
    let selectedText = "";

    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();
      selectedText = selection.toString();
    }

    setSavedSelection({
      range: range,
      selection: selectedText,
    });

    return { range, selectedText };
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelection?.range) {
      try {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelection.range);
        }
        return true;
      } catch (e) {
        console.warn("Could not restore selection:", e);
        return false;
      }
    }
    return false;
  }, [savedSelection]);

  const clearSelection = useCallback(() => {
    setSavedSelection(null);
  }, []);

  const hasValidSelection = useCallback(() => {
    const selection = window.getSelection();
    return selection && !selection.isCollapsed && selection.rangeCount > 0;
  }, []);

  return {
    savedSelection,
    saveCurrentSelection,
    restoreSelection,
    clearSelection,
    hasValidSelection,
  };
}
