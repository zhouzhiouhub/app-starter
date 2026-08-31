import { pageBuilderVisualReferenceImportSchemaVersion } from "./page-builder-visual-reference-import.mjs";
import {
  addArtifactCheckIssue,
  isObject,
} from "./page-builder-visual-artifact-check-paths.mjs";
import {
  hasDuplicateReferenceKeys,
  hasOverlappingReferenceKeys,
  isValidMissingReferenceEntry,
  isValidUpdateReferenceEntry,
} from "./page-builder-visual-reference-import-entries.mjs";
import {
  hasRequiredReferenceList,
  isValidRequiredReferenceList,
} from "./page-builder-visual-reference-import-required-entries.mjs";

const referenceSourceDirStatuses = new Set([
  "missing",
  "not-directory",
  "ready",
]);
const referenceImportStatuses = new Set([
  "invalid",
  "needs-evidence",
  "ready",
  "updated",
  "would-update",
]);
const maxReferenceImportReferenceCount = 20;

export function validateReferenceImportReport(report, context) {
  if (!isObject(report)) {
    return;
  }

  if (report.schemaVersion !== pageBuilderVisualReferenceImportSchemaVersion) {
    addArtifactCheckIssue(
      context,
      "invalid_reference_import_schema",
      `reference import report schemaVersion must be ${pageBuilderVisualReferenceImportSchemaVersion}.`,
    );
  }

  if (
    report.manifestPath !== context.paths.manifest ||
    report.sourceDir !== "docs/visual/page-builder-references"
  ) {
    addArtifactCheckIssue(
      context,
      "reference_import_report_mismatch",
      "reference import report must match the artifact manifest and source dir.",
    );
  }

  validateReferenceImportStatus(report, context);
  validateReferenceImportSourceDirStatus(report, context);
  validateReferenceImportReportCounts(report, context);
  validateReferenceImportMissingEntries(report, context);
  validateReferenceImportUpdateEntries(report, context);
  validateReferenceImportRequiredEntries(report, context);
  validateReferenceImportUniqueEntries(report, context);
  validateReferenceImportDisjointEntries(report, context);
}

export function createReferenceImportSummary(report) {
  if (!isObject(report)) {
    return null;
  }

  return {
    complete: report.complete === true,
    manifestPath: readText(report.manifestPath),
    missingCount: readItemCount(report.missingCount, report.missing),
    missingReferences: readReferencePaths(report.missing),
    sourceDir: readText(report.sourceDir),
    sourceDirStatus: readText(report.sourceDirStatus) ?? "unknown",
    status: readText(report.status) ?? "unknown",
    updated: report.updated === true,
    updateCount: readItemCount(report.updateCount, report.updates),
  };
}

function validateReferenceImportStatus(report, context) {
  if (!referenceImportStatuses.has(report.status)) {
    addArtifactCheckIssue(
      context,
      "invalid_reference_import_status",
      "reference import report status must be invalid, needs-evidence, ready, updated, or would-update.",
    );
  }
}

function validateReferenceImportSourceDirStatus(report, context) {
  if (report.sourceDirStatus === undefined) {
    return;
  }

  if (!referenceSourceDirStatuses.has(report.sourceDirStatus)) {
    addArtifactCheckIssue(
      context,
      "invalid_reference_source_dir_status",
      "reference import report sourceDirStatus must be ready, missing, or not-directory.",
    );
  }
}

function validateReferenceImportReportCounts(report, context) {
  if (
    !Array.isArray(report.missing) ||
    !Array.isArray(report.updates) ||
    report.missingCount !== report.missing.length ||
    report.updateCount !== report.updates.length
  ) {
    addArtifactCheckIssue(
      context,
      "reference_import_report_mismatch",
      "reference import report counts must match its missing and update lists.",
    );
  }
}

function validateReferenceImportMissingEntries(report, context) {
  if (!Array.isArray(report.missing)) {
    return;
  }

  const hasInvalidMissingEntry = report.missing.some(
    (item) => !isValidMissingReferenceEntry(item, report.sourceDir),
  );

  if (hasInvalidMissingEntry) {
    addArtifactCheckIssue(
      context,
      "invalid_reference_import_missing_entry",
      "reference import report missing entries must include a known MVP component, viewport, reason, and a matching expectedPath.",
    );
  }
}

function validateReferenceImportUpdateEntries(report, context) {
  if (!Array.isArray(report.updates)) {
    return;
  }

  const hasInvalidUpdateEntry = report.updates.some(
    (item) => !isValidUpdateReferenceEntry(item, report.sourceDir),
  );

  if (hasInvalidUpdateEntry) {
    addArtifactCheckIssue(
      context,
      "invalid_reference_import_update_entry",
      "reference import report update entries must include a known MVP component, viewport, and matching designReference.",
    );
  }
}

function validateReferenceImportRequiredEntries(report, context) {
  if (!hasRequiredReferenceList(report)) {
    return;
  }

  if (!isValidRequiredReferenceList(report)) {
    addArtifactCheckIssue(
      context,
      "invalid_reference_import_required_entry",
      "reference import report requiredReferences must include one valid entry for every MVP component viewport and match missing/update intake status.",
    );
  }
}

function validateReferenceImportUniqueEntries(report, context) {
  if (
    hasDuplicateReferenceKeys(report.missing) ||
    hasDuplicateReferenceKeys(report.updates)
  ) {
    addArtifactCheckIssue(
      context,
      "duplicate_reference_import_entry",
      "reference import report missing and update entries must not repeat a component viewport pair.",
    );
  }
}

function validateReferenceImportDisjointEntries(report, context) {
  if (hasOverlappingReferenceKeys(report.missing, report.updates)) {
    addArtifactCheckIssue(
      context,
      "reference_import_report_mismatch",
      "reference import report missing and update entries must not overlap.",
    );
  }
}

function readText(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readItemCount(value, items) {
  if (Array.isArray(items)) {
    return items.length;
  }

  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function readReferencePaths(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(readReferencePath)
    .filter(Boolean)
    .slice(0, maxReferenceImportReferenceCount);
}

function readReferencePath(item) {
  return isObject(item) ? readText(item.expectedPath) : null;
}
