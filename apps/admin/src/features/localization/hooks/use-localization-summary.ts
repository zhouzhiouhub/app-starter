import { useCallback, useEffect, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { getLocalizationSummary } from "../api";
import type { LocalizationSummary } from "../types";

export function useLocalizationSummary() {
  const [summary, setSummary] = useState<LocalizationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSummary(await getLocalizationSummary());
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { error, isLoading, load, summary };
}
