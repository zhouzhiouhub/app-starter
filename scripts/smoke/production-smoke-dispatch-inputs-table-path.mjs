import { normalizeSmokeReportTextPath } from "./smoke-report-path-config.mjs";

export const defaultProductionSmokeDispatchInputsTableOutputPath =
  "artifacts/production-smoke/production-smoke-dispatch-inputs.tsv";

export function normalizeProductionSmokeDispatchInputsTableOutputPath(value) {
  return normalizeSmokeReportTextPath(value, {
    extension: ".tsv",
    extensionIssue: "non-tsv-extension",
    label: "Production Smoke dispatch inputs table output",
    relativeDescription: "repository-relative TSV path",
  });
}
