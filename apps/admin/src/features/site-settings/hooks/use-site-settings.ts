import { useCallback, useEffect, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { getSiteSettings, updateSiteSettings } from "../api";
import type { SiteSettings, UpdateSiteSettingsInput } from "../types";

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSettings(await getSiteSettings());
    } catch (caught) {
      handleError(caught, setError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (input: UpdateSiteSettingsInput) => {
    setIsSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await updateSiteSettings(input);
      setSettings(updated);
      setFeedback("Site settings saved.");
    } catch (caught) {
      handleError(caught, setError);
    } finally {
      setIsSaving(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    error,
    feedback,
    isLoading,
    isSaving,
    load,
    save,
    settings,
  };
}

function handleError(
  caught: unknown,
  setError: (message: string | null) => void,
) {
  if (caught instanceof AuthRequiredError) {
    globalThis.location.assign("/login");
    return;
  }

  setError(formatRequestError(caught));
}
