import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { getLocalizationSummary } from "../api";
import type { LocalizationSummary, TranslationListFilters } from "../types";

export function useLocalizationSummary(filters: TranslationListFilters = {}) {
  const [summary, setSummary] = useState<LocalizationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedFilters = useMemo(
    () => ({
      limit: filters.limit,
      namespace: filters.namespace,
      page: filters.page,
      query: filters.query,
    }),
    [filters.limit, filters.namespace, filters.page, filters.query],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSummary(await getLocalizationSummary(normalizedFilters));
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [normalizedFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  return { error, isLoading, load, summary };
}
