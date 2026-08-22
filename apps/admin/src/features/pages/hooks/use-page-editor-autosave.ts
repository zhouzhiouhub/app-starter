import { useEffect } from "react";

const AUTO_SAVE_DELAY_MS = 30_000;

export function usePageEditorAutosave(input: {
  enabled: boolean;
  isBusy: boolean;
  onSaveDraft: () => void | Promise<void>;
}) {
  useEffect(() => {
    if (!input.enabled || input.isBusy) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void input.onSaveDraft();
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [input.enabled, input.isBusy, input.onSaveDraft]);

  useEffect(() => {
    if (!input.enabled || input.isBusy) {
      return;
    }

    function handleWindowBlur() {
      void input.onSaveDraft();
    }

    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, [input.enabled, input.isBusy, input.onSaveDraft]);
}
