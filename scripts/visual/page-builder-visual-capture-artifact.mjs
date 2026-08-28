import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

export const pageBuilderVisualCaptureSchemaVersion =
  "page-builder-visual-capture.v1";

const maxCaptureTextLength = 420;

export function createPageBuilderVisualCaptureArtifact(result, input = {}) {
  return {
    baseUrl: readText(result.baseUrl, "unknown"),
    browserPath: readText(result.browserPath, "unknown"),
    buildSkipped:
      typeof result.buildSkipped === "boolean" ? result.buildSkipped : null,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    manifestUpdate: createManifestUpdateArtifact(result.manifestUpdate),
    outputDir: readText(result.outputDir, "unknown"),
    schemaVersion: pageBuilderVisualCaptureSchemaVersion,
    screenshotCount: Array.isArray(result.screenshots)
      ? result.screenshots.length
      : 0,
    screenshots: Array.isArray(result.screenshots)
      ? result.screenshots.map(createScreenshotArtifact)
      : [],
    webPort: Number.isInteger(result.webPort) ? result.webPort : null,
  };
}

export async function writePageBuilderVisualCaptureArtifact(
  outputPath,
  artifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function createScreenshotArtifact(screenshot) {
  return {
    bytes: Number.isFinite(screenshot.bytes) ? screenshot.bytes : 0,
    component: readText(screenshot.component, "unknown"),
    evidencePath: readText(screenshot.evidencePath, "unknown"),
    viewport: readText(screenshot.viewport, "unknown"),
  };
}

function createManifestUpdateArtifact(update) {
  if (!update) {
    return null;
  }

  return {
    manifestPath: readText(update.manifestPath, "unknown"),
    updateCount: Array.isArray(update.updates) ? update.updates.length : 0,
    updated: update.updated === true,
    updates: Array.isArray(update.updates)
      ? update.updates.map(createManifestUpdateEntryArtifact)
      : [],
  };
}

function createManifestUpdateEntryArtifact(update) {
  return {
    component: readText(update.component, "unknown"),
    previewScreenshot: readText(update.previewScreenshot, "unknown"),
    viewport: readText(update.viewport, "unknown"),
  };
}

function readText(value, fallback) {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  return formatSmokeText(value, { maxLength: maxCaptureTextLength });
}
