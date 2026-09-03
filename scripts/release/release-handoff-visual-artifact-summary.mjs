import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  formatManifestDesignReferenceSummary,
  formatRequiredSourceReferenceAvailability,
} from "../visual/page-builder-visual-reference-summary-format.mjs";

export function formatVisualArtifactStatus(artifactCheck) {
  if (!artifactCheck) {
    return ["  Visual artifact: not provided"];
  }

  return [
    `  Visual artifact: ${artifactCheck.status}${formatVisualArtifactDetails(
      artifactCheck,
    )}`,
  ];
}

function formatVisualArtifactDetails(artifactCheck) {
  const detailText = [
    formatVisualArtifactDir(artifactCheck.artifactDir),
    formatVisualArtifactCount(
      artifactCheck.presentRequiredFileCount,
      artifactCheck.requiredFileCount,
      "files",
    ),
    formatVisualArtifactCount(
      artifactCheck.presentScreenshotCount,
      artifactCheck.expectedScreenshotCount,
      "screenshots",
    ),
    formatManifestDesignReferenceSummary(artifactCheck),
    formatReferenceImport(artifactCheck.referenceImport),
  ].filter(Boolean);

  return detailText.length > 0 ? ` (${detailText.join(", ")})` : "";
}

function formatVisualArtifactDir(artifactDir) {
  return typeof artifactDir === "string" && artifactDir.length > 0
    ? formatSmokeText(artifactDir, { maxLength: 160 })
    : null;
}

function formatVisualArtifactCount(present, expected, label) {
  if (!Number.isFinite(present) || !Number.isFinite(expected)) {
    return null;
  }

  return `${present}/${expected} ${label}`;
}

function formatReferenceImport(referenceImport) {
  if (!referenceImport) {
    return null;
  }

  const firstMissing = readFirstMissingReference(referenceImport);
  const detailText = [
    formatReferenceImportCount(referenceImport.missingCount, "missing"),
    formatReferenceImportCount(referenceImport.updateCount, "updates"),
    formatRequiredReferenceCoverage(referenceImport),
    firstMissing ? `first missing ${formatSmokeText(firstMissing)}` : null,
    formatFirstMissingReferenceReason(referenceImport),
    formatFirstMissingReferencePreview(referenceImport),
  ].filter(Boolean);

  return `references ${formatSmokeText(
    referenceImport.status,
  )}${detailText.length > 0 ? ` (${detailText.join(", ")})` : ""}`;
}

function formatFirstMissingReferencePreview(referenceImport) {
  return typeof referenceImport.firstMissingReferencePreview === "string" &&
    referenceImport.firstMissingReferencePreview.length > 0
    ? `first missing preview ${formatSmokeText(
        referenceImport.firstMissingReferencePreview,
      )}`
    : null;
}

function formatFirstMissingReferenceReason(referenceImport) {
  return typeof referenceImport.firstMissingReferenceReason === "string" &&
    referenceImport.firstMissingReferenceReason.length > 0
    ? `first missing reason ${formatSmokeText(
        referenceImport.firstMissingReferenceReason,
      )}`
    : null;
}

function formatReferenceImportCount(count, label) {
  return Number.isFinite(count) ? `${count} ${label}` : null;
}

function formatRequiredReferenceCoverage(referenceImport) {
  return formatRequiredSourceReferenceAvailability(referenceImport, {
    includeStatusCounts: false,
  });
}

function readFirstMissingReference(referenceImport) {
  return Array.isArray(referenceImport.missingReferences) &&
    referenceImport.missingReferences.length > 0
    ? referenceImport.missingReferences[0]
    : null;
}
