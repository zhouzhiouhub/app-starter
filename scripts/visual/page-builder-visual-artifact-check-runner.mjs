import { readFileSync, statSync } from "node:fs";
import {
  pageBuilderVisualAcceptanceSchemaVersion,
  validatePageBuilderVisualAcceptanceManifest,
} from "./page-builder-visual-acceptance.mjs";
import {
  createExpectedScreenshotKeys,
  validateCaptureReport,
} from "./page-builder-visual-artifact-check-capture.mjs";
import {
  addArtifactCheckIssue,
  createArtifactPaths,
  isObject,
  requiredArtifactFileNames,
  resolveRepositoryPath,
} from "./page-builder-visual-artifact-check-paths.mjs";
import {
  validateAcceptanceMarkdown,
  validateReferenceImportMarkdown,
} from "./page-builder-visual-artifact-check-markdown-validation.mjs";
import { validateReferenceImportReport } from "./page-builder-visual-artifact-check-reference-import.mjs";

export function checkPageBuilderVisualArtifact(config, input = {}) {
  const context = createArtifactCheckContext(config, input);
  const manifest = readRequiredJson(context.paths.manifest, "manifest", context);
  const captureReport = readRequiredJson(
    context.paths.captureReport,
    "capture report",
    context,
  );
  const acceptanceReport = readRequiredJson(
    context.paths.acceptanceReport,
    "acceptance report",
    context,
  );
  const referenceImportReport = readRequiredJson(
    context.paths.referenceImportReport,
    "reference import report",
    context,
  );
  const screenshots = validateCaptureReport(captureReport, context);
  const manifestReport = validateArtifactManifest(manifest, screenshots, context);

  validateAcceptanceReport(acceptanceReport, manifestReport, context);
  validateReferenceImportReport(referenceImportReport, context);
  validateAcceptanceMarkdown(
    context.paths.acceptanceMarkdown,
    manifestReport,
    context,
  );
  validateReferenceImportMarkdown(
    context.paths.referenceImportMarkdown,
    referenceImportReport,
    context,
  );
  return createArtifactCheckReport(context);
}

function createArtifactCheckContext(config, input) {
  return {
    artifactDir: config.artifactDir,
    cwd: input.cwd ?? process.cwd(),
    expectedScreenshots: createExpectedScreenshotKeys(),
    issues: [],
    paths: createArtifactPaths(config.artifactDir),
    presentRequiredFileCount: 0,
    presentScreenshotCount: 0,
    readFile: input.readFile ?? readFileSync,
    stat: input.stat ?? statSync,
  };
}

function readRequiredJson(filePath, label, context) {
  let body;

  try {
    const resolvedPath = resolveRepositoryPath(context, filePath);
    const stats = context.stat(resolvedPath);

    if (!stats.isFile() || stats.size <= 0) {
      addArtifactCheckIssue(
        context,
        "invalid_artifact_file",
        `${label} must be a non-empty file.`,
      );
      return null;
    }

    context.presentRequiredFileCount += 1;
    body = context.readFile(resolvedPath, "utf8");
  } catch {
    addArtifactCheckIssue(
      context,
      "missing_artifact_file",
      `${label} is missing: ${filePath}.`,
    );
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    addArtifactCheckIssue(
      context,
      "invalid_artifact_json",
      `${label} must contain valid JSON.`,
    );
    return null;
  }
}

function validateArtifactManifest(manifest, screenshots, context) {
  if (!isObject(manifest)) {
    return null;
  }

  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot: context.cwd,
  });

  if (report.errorCount > 0) {
    addArtifactCheckIssue(
      context,
      "artifact_manifest_invalid",
      "artifact manifest has invalid visual evidence paths or records.",
    );
  }

  validateManifestScreenshotPaths(manifest, screenshots, context);
  return report;
}

function validateManifestScreenshotPaths(manifest, screenshots, context) {
  for (const key of context.expectedScreenshots.keys()) {
    const [component, viewport] = key.split(".");
    const screenshot = screenshots.get(key);
    const previewScreenshot = findManifestPreviewScreenshot(
      manifest,
      component,
      viewport,
    );

    if (!screenshot || previewScreenshot === screenshot.evidencePath) {
      continue;
    }

    addArtifactCheckIssue(
      context,
      "manifest_screenshot_mismatch",
      `${key} manifest previewScreenshot must match the captured screenshot path.`,
    );
  }
}

function validateAcceptanceReport(report, manifestReport, context) {
  if (!isObject(report)) {
    return;
  }

  if (report.schemaVersion !== pageBuilderVisualAcceptanceSchemaVersion) {
    addArtifactCheckIssue(
      context,
      "invalid_acceptance_schema",
      `acceptance report schemaVersion must be ${pageBuilderVisualAcceptanceSchemaVersion}.`,
    );
  }

  if (!isObject(report.checklist)) {
    addArtifactCheckIssue(
      context,
      "missing_acceptance_checklist",
      "acceptance report must include checklist.",
    );
  }

  if (manifestReport) {
    validateAcceptanceReportMatchesManifest(report, manifestReport, context);
  }
}

function validateAcceptanceReportMatchesManifest(report, manifestReport, context) {
  for (const field of [
    "status",
    "componentCount",
    "viewportCount",
    "acceptedComponentCount",
    "acceptedViewportCount",
    "errorCount",
    "warningCount",
  ]) {
    if (report[field] !== manifestReport[field]) {
      addArtifactCheckIssue(
        context,
        "acceptance_report_mismatch",
        `acceptance report ${field} must match the artifact manifest review.`,
      );
    }
  }
}

function createArtifactCheckReport(context) {
  const errorCount = context.issues.filter((issue) => issue.severity === "error")
    .length;

  return {
    artifactDir: context.artifactDir,
    expectedScreenshotCount: context.expectedScreenshots.size,
    issues: context.issues,
    presentRequiredFileCount: context.presentRequiredFileCount,
    presentScreenshotCount: context.presentScreenshotCount,
    requiredFileCount: Object.keys(requiredArtifactFileNames).length,
    status: errorCount === 0 ? "complete" : "invalid",
  };
}

function findManifestPreviewScreenshot(manifest, component, viewport) {
  const record = Array.isArray(manifest.records)
    ? manifest.records.find((item) => item.component === component)
    : null;

  return record?.viewports?.[viewport]?.previewScreenshot ?? null;
}
