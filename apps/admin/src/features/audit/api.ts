import { adminRequest } from "../auth/api";
import { readApiResponseJson } from "../../lib/api-response.ts";
import { DEFAULT_AUDIT_LOG_LIST_LIMIT } from "./constants";
import type { AuditLog, AuditLogFilters, AuditLogListMeta } from "./types";

export async function listAuditLogs(
  filters: AuditLogFilters = {},
  page = 1,
  limit = DEFAULT_AUDIT_LOG_LIST_LIMIT,
): Promise<{ data: AuditLog[]; meta: AuditLogListMeta }> {
  const query = buildAuditLogQuery(filters, page, limit);
  const result = await readAdminJson<{
    data?: AuditLog[];
    meta?: Partial<AuditLogListMeta>;
  }>(
    `/audit-logs?${query.toString()}`,
    {},
    "Audit logs could not be loaded.",
  );

  return {
    data: result.data ?? [],
    meta: {
      limit: result.meta?.limit ?? limit,
      page: result.meta?.page ?? page,
      total: result.meta?.total ?? result.data?.length ?? 0,
    },
  };
}

function buildAuditLogQuery(
  filters: AuditLogFilters,
  page: number,
  limit: number,
): URLSearchParams {
  const query = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });

  Object.entries(filters).forEach(([key, value]) => {
    const normalized = value?.trim();

    if (normalized) {
      query.set(key, normalized);
    }
  });

  return query;
}

async function readAdminJson<T>(
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await adminRequest(path, init);
  return readApiResponseJson<T>(response, fallback);
}
