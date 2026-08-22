export const smokeReportSchemaVersion = "smoke-report.v3";

export const smokeCheckStatuses = new Set(["failed", "passed"]);

export const writableReportFields = [
  "checks",
  "config",
  "environment",
  "productionReadiness",
  "schemaVersion",
  "slug",
  "startedAt",
  "status",
  "summary",
  "title",
];
