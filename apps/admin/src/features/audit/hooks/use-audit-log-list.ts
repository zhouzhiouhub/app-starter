import { useCallback, useEffect, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { listAuditLogs } from "../api";
import { DEFAULT_AUDIT_LOG_LIST_LIMIT } from "../constants";
import type { AuditLog, AuditLogFilters, AuditLogListMeta } from "../types";

export function useAuditLogList(filters: AuditLogFilters, page = 1) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditLogListMeta>({
    limit: DEFAULT_AUDIT_LOG_LIST_LIMIT,
    page: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listAuditLogs(
        filters,
        nextPage,
        DEFAULT_AUDIT_LOG_LIST_LIMIT,
      );
      setLogs(result.data);
      setMeta(result.meta);
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  return { error, isLoading, load, logs, meta };
}
