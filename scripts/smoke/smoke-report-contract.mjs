export const smokeReportSchemaVersion = "smoke-report.v3";

export const smokeCheckStatuses = new Set(["failed", "passed"]);

export const writableReportFields = [
  "checks",
  "config",
  "error",
  "environment",
  "finishedAt",
  "pageId",
  "productionReadiness",
  "schemaVersion",
  "slug",
  "startedAt",
  "status",
  "storefrontRequestUrl",
  "storefrontUrl",
  "summary",
  "title",
];
