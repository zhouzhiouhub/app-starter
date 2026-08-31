import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

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
    requiredReferenceCount:
      mvpPageBuilderComponents.length *
      pageBuilderVisualAcceptanceViewports.length,
    requiredReferences: createRequiredReferenceArtifacts(report),
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

function createRequiredReferenceArtifacts(report) {
  const missingByReference = createReferenceLookup(report.missing);
  const updatesByReference = createReferenceLookup(report.updates);

  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) =>
      createRequiredReferenceArtifact({
        component,
        missing: missingByReference.get(createReferenceKey(component, viewport)),
        report,
        update: updatesByReference.get(createReferenceKey(component, viewport)),
        viewport,
      }),
    ),
  );
}

function createRequiredReferenceArtifact(input) {
  const expectedPath = readExpectedPath(
    {
      component: input.component,
      expectedPath: input.missing?.expectedPath,
      viewport: input.viewport,
    },
    input.report.sourceDir,
  );

  return withOptionalPreviewScreenshot({
    component: input.component,
    expectedPath,
    status: readRequiredReferenceStatus(input),
    ...(input.missing ? { reason: input.missing.reason } : {}),
    ...(input.update ? { designReference: input.update.designReference } : {}),
    viewport: input.viewport,
  }, input.missing ?? input.update ?? {});
}

function readRequiredReferenceStatus(input) {
  if (input.missing) {
    return "missing";
  }

  if (!input.update) {
    return "ready";
  }

  return input.report.status === "updated" || input.report.updated === true
    ? "updated"
    : "would-update";
}

function createReferenceLookup(items) {
  const lookup = new Map();

  if (!Array.isArray(items)) {
    return lookup;
  }

  for (const item of items) {
    lookup.set(createReferenceKey(item.component, item.viewport), item);
  }

  return lookup;
}

function createReferenceKey(component, viewport) {
  return `${component}:${viewport}`;
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
