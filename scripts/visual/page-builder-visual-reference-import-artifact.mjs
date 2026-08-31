import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const pageBuilderVisualReferenceImportSchemaVersion =
  "page-builder-visual-reference-import.v1";

export function createPageBuilderVisualReferenceImportArtifact(
  report,
  input = {},
) {
  const missing = Array.isArray(report.missing) ? report.missing : [];
  const updates = Array.isArray(report.updates) ? report.updates : [];

  return {
    complete: report.complete === true,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    manifestPath: report.manifestPath,
    missing: missing.map((item) =>
      createMissingReferenceArtifact(item, report.sourceDir),
    ),
    missingCount: missing.length,
    schemaVersion: pageBuilderVisualReferenceImportSchemaVersion,
    sourceDir: report.sourceDir,
    sourceDirStatus: report.sourceDirStatus ?? "ready",
    status: report.status,
    updated: report.updated === true,
    updateCount: updates.length,
    updates: updates.map(createReferenceUpdateArtifact),
  };
}

export async function writePageBuilderVisualReferenceImportArtifact(
  outputPath,
  artifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function createMissingReferenceArtifact(missing, sourceDir) {
  return withOptionalPreviewScreenshot({
    component: missing.component,
    expectedPath: readExpectedPath(missing, sourceDir),
    reason: missing.reason,
    viewport: missing.viewport,
  }, missing);
}

function readExpectedPath(missing, sourceDir) {
  return typeof missing.expectedPath === "string" &&
    missing.expectedPath.length > 0
    ? missing.expectedPath
    : `${sourceDir}/${missing.component}-${missing.viewport}.png`;
}

function createReferenceUpdateArtifact(update) {
  return withOptionalPreviewScreenshot({
    component: update.component,
    designReference: update.designReference,
    viewport: update.viewport,
  }, update);
}

function withOptionalPreviewScreenshot(output, input) {
  const previewScreenshot = readPreviewScreenshot(input.previewScreenshot);

  return previewScreenshot
    ? {
        ...output,
        previewScreenshot,
      }
    : output;
}

function readPreviewScreenshot(previewScreenshot) {
  if (
    !previewScreenshot ||
    typeof previewScreenshot !== "object" ||
    Array.isArray(previewScreenshot) ||
    typeof previewScreenshot.path !== "string" ||
    previewScreenshot.path.length === 0
  ) {
    return null;
  }

  return {
    path: previewScreenshot.path,
    ...(Number.isFinite(previewScreenshot.height)
      ? { height: previewScreenshot.height }
      : {}),
    ...(Number.isFinite(previewScreenshot.width)
      ? { width: previewScreenshot.width }
      : {}),
    ...(typeof previewScreenshot.error === "string" &&
    previewScreenshot.error.length > 0
      ? { error: previewScreenshot.error }
      : {}),
  };
}
