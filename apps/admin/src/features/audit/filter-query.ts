import type { AuditLogFilters } from "./types";

const auditLogFilterKeys = [
  "action",
  "actorId",
  "targetId",
  "targetType",
] as const satisfies readonly (keyof AuditLogFilters)[];

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

export function buildAuditLogSearch(filters: AuditLogFilters): string {
  const searchParams = new URLSearchParams();

  auditLogFilterKeys.forEach((key) => {
    const value = filters[key]?.trim();

    if (value) {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}
