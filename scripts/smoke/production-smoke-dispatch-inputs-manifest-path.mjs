import { normalizeSmokeReportTextPath } from "./smoke-report-path-config.mjs";

export const defaultProductionSmokeDispatchInputsManifestOutputPath =
  "artifacts/production-smoke/production-smoke-dispatch-inputs.json";

export function normalizeProductionSmokeDispatchInputsManifestOutputPath(value) {
  return normalizeSmokeReportTextPath(value, {
    extension: ".json",
    extensionIssue: "non-json-extension",
    label: "Production Smoke dispatch inputs JSON output",
    relativeDescription: "repository-relative JSON path",
  });
}
