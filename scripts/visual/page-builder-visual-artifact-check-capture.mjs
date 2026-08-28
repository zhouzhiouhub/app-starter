import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";
import { pageBuilderVisualCaptureSchemaVersion } from "./page-builder-visual-capture-artifact.mjs";
import {
  pageBuilderVisualCaptureDefaultHeight,
  pageBuilderVisualCaptureViewportWidths,
} from "./page-builder-visual-capture-constants.mjs";
import { decodePngImage } from "./png-image-reader.mjs";
import {
  addArtifactCheckIssue,
  isObject,
  readErrorMessage,
  readSafeArtifactEvidencePath,
  resolveRepositoryPath,
} from "./page-builder-visual-artifact-check-paths.mjs";

export function createExpectedScreenshotKeys() {
  const entries = [];

  for (const component of mvpPageBuilderComponents) {
    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      entries.push([`${component}.${viewport}`, { component, viewport }]);
    }
  }

  return new Map(entries);
}

export function validateCaptureReport(report, context) {
  if (!isObject(report)) {
    return new Map();
  }

  if (report.schemaVersion !== pageBuilderVisualCaptureSchemaVersion) {
    addArtifactCheckIssue(
      context,
      "invalid_capture_schema",
      `capture report schemaVersion must be ${pageBuilderVisualCaptureSchemaVersion}.`,
    );
  }

  if (report.outputDir !== context.artifactDir) {
    addArtifactCheckIssue(
      context,
      "capture_output_dir_mismatch",
      `capture report outputDir must be ${context.artifactDir}.`,
    );
  }

  validateCaptureManifestUpdate(report.manifestUpdate, context);
  return validateCaptureScreenshots(report, context);
}

function validateCaptureManifestUpdate(update, context) {
  if (!isObject(update)) {
    addArtifactCheckIssue(
      context,
      "capture_manifest_update_missing",
      "capture report must include manifest update metadata.",
    );
    return;
  }

  if (update.manifestPath !== context.paths.manifest) {
    addArtifactCheckIssue(
      context,
      "capture_manifest_path_mismatch",
      `capture report manifestPath must be ${context.paths.manifest}.`,
    );
  }
}

function validateCaptureScreenshots(report, context) {
  const screenshots = Array.isArray(report.screenshots) ? report.screenshots : [];
  const byKey = new Map();

  if (!Array.isArray(report.screenshots)) {
    addArtifactCheckIssue(
      context,
      "invalid_capture_screenshots",
      "capture screenshots must be an array.",
    );
  }

  if (report.screenshotCount !== screenshots.length) {
    addArtifactCheckIssue(
      context,
      "capture_screenshot_count_mismatch",
      "capture screenshotCount must match the serialized screenshot entries.",
    );
  }

  for (const screenshot of screenshots) {
    validateCaptureScreenshot(screenshot, byKey, context);
  }

  for (const expected of context.expectedScreenshots.keys()) {
    if (!byKey.has(expected)) {
      addArtifactCheckIssue(
        context,
        "missing_capture_screenshot",
        `${expected} screenshot is missing.`,
      );
    }
  }

  return byKey;
}

function validateCaptureScreenshot(screenshot, byKey, context) {
  if (!isObject(screenshot)) {
    addArtifactCheckIssue(
      context,
      "invalid_capture_screenshot",
      "capture screenshot entries must be objects.",
    );
    return;
  }

  const key = `${screenshot.component}.${screenshot.viewport}`;
  const expected = context.expectedScreenshots.get(key);

  if (!expected) {
    addArtifactCheckIssue(
      context,
      "unexpected_capture_screenshot",
      `${key} is not an MVP screenshot target.`,
    );
    return;
  }

  if (byKey.has(key)) {
    addArtifactCheckIssue(
      context,
      "duplicate_capture_screenshot",
      `${key} screenshot is duplicated.`,
    );
    return;
  }

  byKey.set(key, screenshot);
  validateScreenshotFile(screenshot, key, context);
}

function validateScreenshotFile(screenshot, key, context) {
  const evidencePath = readSafeArtifactEvidencePath(
    screenshot.evidencePath,
    context,
  );

  if (!evidencePath) {
    addArtifactCheckIssue(
      context,
      "invalid_screenshot_path",
      `${key} screenshot path is unsafe.`,
    );
    return;
  }

  try {
    const resolvedPath = resolveRepositoryPath(context, evidencePath);
    const stats = context.stat(resolvedPath);

    if (!stats.isFile() || stats.size <= 0) {
      addArtifactCheckIssue(
        context,
        "invalid_screenshot_file",
        `${key} screenshot must be non-empty.`,
      );
      return;
    }

    const image = decodePngImage(
      readScreenshotBuffer(resolvedPath, context),
      evidencePath,
    );

    if (screenshot.bytes !== stats.size) {
      addArtifactCheckIssue(
        context,
        "screenshot_size_mismatch",
        `${key} screenshot bytes do not match.`,
      );
      return;
    }

    if (!hasExpectedScreenshotDimensions(image, screenshot.viewport)) {
      addArtifactCheckIssue(
        context,
        "screenshot_dimensions_mismatch",
        `${key} screenshot dimensions must be ${readExpectedDimensionsLabel(
          screenshot.viewport,
        )}; got ${image.width}x${image.height}.`,
      );
      return;
    }

    context.presentScreenshotCount += 1;
  } catch (error) {
    addArtifactCheckIssue(
      context,
      "invalid_screenshot_file",
      `${key} screenshot is not a retained PNG file: ${readErrorMessage(error)}`,
    );
  }
}

function readScreenshotBuffer(resolvedPath, context) {
  const body = context.readFile(resolvedPath);
  return Buffer.isBuffer(body) ? body : Buffer.from(body);
}

function hasExpectedScreenshotDimensions(image, viewport) {
  return (
    image.width === pageBuilderVisualCaptureViewportWidths[viewport] &&
    image.height === pageBuilderVisualCaptureDefaultHeight
  );
}

function readExpectedDimensionsLabel(viewport) {
  return `${pageBuilderVisualCaptureViewportWidths[viewport]}x${pageBuilderVisualCaptureDefaultHeight}`;
}
