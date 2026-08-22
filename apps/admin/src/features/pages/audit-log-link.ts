import { buildAuditLogSearch } from "../audit/filter-query";

export function buildPageAuditLogPath(pageId: string): string {
  return `/audit-logs?${buildAuditLogSearch({
    targetId: pageId,
    targetType: "page",
  })}`;
}
