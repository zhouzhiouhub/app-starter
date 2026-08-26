import { redactSmokeReportValue } from "./smoke-secrets.mjs";

const defaultReadinessStringLength = 512;
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

  return {
    ...artifact,
    productionReadiness: boundProductionReadinessArtifact(
      artifact.productionReadiness,
    ),
  };
}

function boundProductionReadinessArtifact(value) {
  return boundReadinessArtifactValue(value);
}

function boundReadinessArtifactValue(value, key = "") {
  if (typeof value === "string") {
    return truncateText(
      normalizeArtifactText(value),
      readReadinessStringLength(key),
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => boundReadinessArtifactValue(item, key));
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        boundReadinessArtifactValue(childValue, childKey),
      ]),
    );
  }

  return value;
}

function readReadinessStringLength(key) {
  return readinessStringLengths.get(key) ?? defaultReadinessStringLength;
}

function normalizeArtifactText(value) {
  return replaceControlCharacters(value).replace(/\s+/g, " ").trim();
}

function replaceControlCharacters(value) {
  let result = "";

  for (const character of String(value)) {
    const code = character.charCodeAt(0);
    result += code <= 31 || code === 127 ? " " : character;
  }

  return result;
}

function truncateText(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
