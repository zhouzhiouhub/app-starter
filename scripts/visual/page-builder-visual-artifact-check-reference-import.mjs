import { pageBuilderVisualReferenceImportSchemaVersion } from "./page-builder-visual-reference-import.mjs";
import {
  addArtifactCheckIssue,
  isObject,
} from "./page-builder-visual-artifact-check-paths.mjs";

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
}

export function createReferenceImportSummary(report) {
  if (!isObject(report)) {
    return null;
  }

  return {
    complete: report.complete === true,
    manifestPath: readText(report.manifestPath),
    missingCount: readItemCount(report.missingCount, report.missing),
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
