import type { AuditLogFilters } from "./types";

const auditLogFilterKeys = [
  "action",
  "actorId",
  "targetId",
  "targetType",
] as const satisfies readonly (keyof AuditLogFilters)[];

const defaultPage = 1;

interface AuditLogSearchOptions {
  page?: number;
}

export function readAuditLogFilters(
  searchParams: URLSearchParams,
): AuditLogFilters {
  return auditLogFilterKeys.reduce<AuditLogFilters>((filters, key) => {
    const value = searchParams.get(key)?.trim();

    if (value) {
      filters[key] = value;
    }

    return filters;
  }, {});
}

export function readAuditLogPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get("page"));

  if (!Number.isInteger(page) || page < defaultPage) {
    return defaultPage;
  }

  return page;
}

export function buildAuditLogSearch(
  filters: AuditLogFilters,
  options: AuditLogSearchOptions = {},
): string {
  const searchParams = new URLSearchParams();

  auditLogFilterKeys.forEach((key) => {
    const value = filters[key]?.trim();

    if (value) {
      searchParams.set(key, value);
    }
  });

  if (options.page && options.page > defaultPage) {
    searchParams.set("page", String(options.page));
  }

  return searchParams.toString();
}
