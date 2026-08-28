import { validateVisualAcceptanceEvidencePath } from "./page-builder-visual-acceptance-evidence-paths.mjs";
import { createVisualAcceptanceIssue } from "./page-builder-visual-acceptance-targets.mjs";

const evidencePathFields = ["designReference", "previewScreenshot"];

export function validateProvidedViewportEvidencePaths(
  component,
  viewport,
  evidence,
  context,
) {
  let valid = true;

  for (const field of evidencePathFields) {
    const value = evidence[field];

    if (isUnsetEvidencePath(value)) {
      continue;
    }

    valid =
      validateVisualAcceptanceEvidencePath(
        { component, field, value, viewport },
        context,
      ) && valid;
  }

  return valid;
}

export function validateAcceptedViewportEvidence(
  component,
  viewport,
  evidence,
  context,
) {
  const pathsValid = evidencePathFields
    .map((field) =>
      validateVisualAcceptanceEvidencePath(
        {
          component,
          field,
          value: evidence[field],
          viewport,
        },
        context,
      ),
    )
    .every(Boolean);

  return (
    [
      validateEvidenceNumber(
        evidence.visualMatchPercent,
        context.targets.minVisualMatchPercent,
        "min",
        `${component}.${viewport}.visualMatchPercent`,
        context,
        component,
        viewport,
      ),
      validateEvidenceNumber(
        evidence.maxLayoutDeltaPx,
        context.targets.maxLayoutDeltaPx,
        "max",
        `${component}.${viewport}.maxLayoutDeltaPx`,
        context,
        component,
        viewport,
      ),
      validateEvidenceNumber(
        evidence.maxColorDeltaE,
        context.targets.maxColorDeltaE,
        "max",
        `${component}.${viewport}.maxColorDeltaE`,
        context,
        component,
        viewport,
      ),
    ].every(Boolean) && pathsValid
  );
}

function isUnsetEvidencePath(value) {
  return value === null || value === undefined || value === "";
}

function validateEvidenceNumber(
  value,
  threshold,
  mode,
  label,
  context,
  component,
  viewport,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    context.issues.push({
      ...createVisualAcceptanceIssue(
        "error",
        "missing_evidence_metric",
        `${label} must be a finite number for accepted evidence.`,
        component,
        viewport,
      ),
    });
    return false;
  }

  if (mode === "min" ? value < threshold : value > threshold) {
    context.issues.push({
      ...createVisualAcceptanceIssue(
        "error",
        "evidence_threshold_failed",
        `${label} (${value}) does not satisfy the target ${mode} ${threshold}.`,
        component,
        viewport,
      ),
    });
    return false;
  }

  return true;
}
