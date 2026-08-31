import type { CustomAdminRoute } from "@app-starter/custom-admin";
import { useCallback, useEffect, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { getDashboardSummary } from "../api";
import type { DashboardSummary } from "../types";

export function useDashboardSummary(customRoutes: CustomAdminRoute[]) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSummary(await getDashboardSummary(customRoutes));
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [customRoutes]);

  useEffect(() => {
    void load();
  }, [load]);

  return { error, isLoading, load, summary };
}
