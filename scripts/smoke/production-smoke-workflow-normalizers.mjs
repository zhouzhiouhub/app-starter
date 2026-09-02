import { normalizePlainValue } from "../release/release-notes-validation.mjs";

const safeWorkflowFilePattern = /^[A-Za-z0-9._-]+\.ya?ml$/u;
const safeWorkflowRefPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$/u;

export function normalizeProductionSmokeWorkflowFile(value) {
  const normalized = normalizePlainValue("workflow file", value);

  if (!safeWorkflowFilePattern.test(normalized)) {
    throw new Error("Workflow file must be a safe .yml or .yaml filename.");
  }

  return normalized;
}

export function normalizeProductionSmokeWorkflowRef(value) {
  const normalized = normalizePlainValue("workflow ref", value);

  if (
    !safeWorkflowRefPattern.test(normalized) ||
    normalized.includes("..") ||
    normalized.includes("//") ||
    normalized.endsWith("/")
  ) {
    throw new Error("Workflow ref must be a safe branch, tag, or commit ref.");
  }

  return normalized;
}
