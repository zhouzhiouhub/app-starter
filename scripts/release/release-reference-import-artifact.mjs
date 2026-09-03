import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxReferenceImportArtifactTextLength = 420;

export function createOptionalReferenceImportArtifact(referenceImport) {
  if (!referenceImport) {
    return {};
  }

  return {
    referenceImport: {
      complete: referenceImport.complete === true,
      ...createOptionalText(
        "firstMissingReferencePreview",
        referenceImport.firstMissingReferencePreview,
      ),
      manifestPath: readTextOrNull(referenceImport.manifestPath),
      missingCount: readCount(referenceImport.missingCount),
      missingReferences: readStringList(referenceImport.missingReferences),
      ...createOptionalRequiredReferenceSummary(referenceImport),
      sourceDir: readTextOrNull(referenceImport.sourceDir),
      sourceDirStatus: readTextOrNull(referenceImport.sourceDirStatus) ?? "unknown",
      status: readTextOrNull(referenceImport.status) ?? "unknown",
      updated: referenceImport.updated === true,
      updateCount: readCount(referenceImport.updateCount),
    },
  };
}

function createOptionalRequiredReferenceSummary(referenceImport) {
  if (
    referenceImport.requiredReferenceCount === undefined &&
    referenceImport.requiredReferenceEntryCount === undefined &&
    referenceImport.requiredReferenceStatusCounts === undefined
  ) {
    return {};
  }

  return {
    requiredReferenceCount: readCount(referenceImport.requiredReferenceCount),
    requiredReferenceEntryCount: readCount(
      referenceImport.requiredReferenceEntryCount,
    ),
    requiredReferenceStatusCounts: readRequiredReferenceStatusCounts(
      referenceImport.requiredReferenceStatusCounts,
    ),
  };
}

function readRequiredReferenceStatusCounts(value) {
  const counts = isObject(value) ? value : {};

  return {
    invalid: readCount(counts.invalid),
    missing: readCount(counts.missing),
    ready: readCount(counts.ready),
    updated: readCount(counts.updated),
    wouldUpdate: readCount(counts.wouldUpdate),
  };
}

function readCount(value) {
  return Number.isFinite(value) ? value : 0;
}

function readStringList(value) {
  return Array.isArray(value)
    ? value.map(readTextOrNull).filter(Boolean)
    : [];
}

function createOptionalText(field, value) {
  const text = readTextOrNull(value);

  return text ? { [field]: text } : {};
}

function readTextOrNull(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, {
    maxLength: maxReferenceImportArtifactTextLength,
  });
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
