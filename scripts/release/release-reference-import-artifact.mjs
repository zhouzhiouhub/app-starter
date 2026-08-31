import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxReferenceImportArtifactTextLength = 420;

export function createOptionalReferenceImportArtifact(referenceImport) {
  if (!referenceImport) {
    return {};
  }

  return {
    referenceImport: {
      complete: referenceImport.complete === true,
      manifestPath: readTextOrNull(referenceImport.manifestPath),
      missingCount: readCount(referenceImport.missingCount),
      sourceDir: readTextOrNull(referenceImport.sourceDir),
      sourceDirStatus: readTextOrNull(referenceImport.sourceDirStatus) ?? "unknown",
      status: readTextOrNull(referenceImport.status) ?? "unknown",
      updated: referenceImport.updated === true,
      updateCount: readCount(referenceImport.updateCount),
    },
  };
}

function readCount(value) {
  return Number.isFinite(value) ? value : 0;
}

function readTextOrNull(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, {
    maxLength: maxReferenceImportArtifactTextLength,
  });
}
