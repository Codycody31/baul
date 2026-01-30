import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/uiStore";

interface KeyboardShortcutHandlers {
  onDelete?: () => void;
  onRename?: () => void;
  onSelectAll?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers = {}) {
  const queryClient = useQueryClient();
  const { selectedObjects, clearSelection } = useUIStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if focus is on input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if dialog is open
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Delete / Backspace - Delete selected objects
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedObjects.length > 0
      ) {
        e.preventDefault();
        handlers.onDelete?.();
        return;
      }

      // F2 - Rename (single selection only)
      if (e.key === "F2" && selectedObjects.length === 1) {
        e.preventDefault();
        handlers.onRename?.();
        return;
      }

      // Ctrl/Cmd + R - Refresh
      if (ctrlOrCmd && e.key === "r") {
        e.preventDefault();
        queryClient.invalidateQueries({ queryKey: ["objects"] });
        return;
      }

      // Ctrl/Cmd + A - Select all
      if (ctrlOrCmd && e.key === "a") {
        e.preventDefault();
        handlers.onSelectAll?.();
        return;
      }

      // Escape - Clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }
    },
    [selectedObjects, handlers, clearSelection, queryClient]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Hook for copying to clipboard
export function useCopyToClipboard() {
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        return true;
      } catch {
        return false;
      } finally {
        textArea.remove();
      }
    }
  }, []);

  return copyToClipboard;
}
