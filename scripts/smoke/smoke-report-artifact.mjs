import { createSmokeReportSummary } from "./smoke-report-summary.mjs";
import { redactSmokeReportValue } from "./smoke-secrets.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

const defaultFailureStringLength = 1024;
const defaultReadinessStringLength = 512;
const failureStringLengths = new Map([
  ["body", 2048],
  ["bodyReadError", 1024],
  ["bodySnippet", 2048],
  ["canonicalHref", 2048],
  ["diagnosis", 256],
  ["documentTitle", 512],
  ["expectedCanonicalUrl", 2048],
  ["expectedOpenGraphUrl", 2048],
  ["expectedUrl", 2048],
  ["message", 1024],
  ["name", 160],
  ["openGraphUrl", 2048],
  ["redirectLocation", 2048],
  ["responseBody", 2048],
  ["url", 2048],
]);
const readinessStringLengths = new Map([
  ["action", 512],
  ["area", 160],
  ["host", 160],
  ["issue", 128],
  ["message", 512],
  ["missingRequired", 160],
  ["path", 512],
  ["variable", 160],
]);

export function createWritableSmokeReportArtifact(report) {
  const artifact = redactSmokeReportValue(report);
  const boundedArtifact = {
    ...artifact,
    checks: boundChecksArtifact(artifact.checks),
    error: boundFailureArtifactValue(artifact.error),
    productionReadiness: boundProductionReadinessArtifact(
      artifact.productionReadiness,
    ),
  };

  return {
    ...boundedArtifact,
    summary: createSmokeReportSummary(boundedArtifact),
  };
}

function boundChecksArtifact(checks) {
  return Array.isArray(checks)
    ? checks.map((check) => boundFailureArtifactValue(check))
    : checks;
}

function boundProductionReadinessArtifact(value) {
  return boundArtifactValue(value, "", readReadinessStringLength);
}

function boundFailureArtifactValue(value) {
  return boundArtifactValue(value, "", readFailureStringLength);
}

function boundArtifactValue(value, key, readStringLength) {
  if (typeof value === "string") {
    return formatSmokeText(value, { maxLength: readStringLength(key) });
  }

  if (Array.isArray(value)) {
    return value.map((item) => boundArtifactValue(item, key, readStringLength));
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        boundArtifactValue(childValue, childKey, readStringLength),
      ]),
    );
  }

  return value;
}

function readFailureStringLength(key) {
  return failureStringLengths.get(key) ?? defaultFailureStringLength;
}

function readReadinessStringLength(key) {
  return readinessStringLengths.get(key) ?? defaultReadinessStringLength;
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
