import { formatSmokeText } from "../smoke/smoke-text.mjs";

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
    formatVisualArtifactCount(
      artifactCheck.presentDesignReferenceCount,
      artifactCheck.referencedDesignReferenceCount,
      "design references",
    ),
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
    firstMissing ? `first missing ${formatSmokeText(firstMissing)}` : null,
  ].filter(Boolean);

  return `references ${formatSmokeText(
    referenceImport.status,
  )}${detailText.length > 0 ? ` (${detailText.join(", ")})` : ""}`;
}

function formatReferenceImportCount(count, label) {
  return Number.isFinite(count) ? `${count} ${label}` : null;
}

function readFirstMissingReference(referenceImport) {
  return Array.isArray(referenceImport.missingReferences) &&
    referenceImport.missingReferences.length > 0
    ? referenceImport.missingReferences[0]
    : null;
}
