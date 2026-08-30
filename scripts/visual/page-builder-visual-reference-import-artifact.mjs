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
  return {
    component: missing.component,
    expectedPath: `${sourceDir}/${missing.component}-${missing.viewport}.png`,
    reason: missing.reason,
    viewport: missing.viewport,
  };
}

function createReferenceUpdateArtifact(update) {
  return {
    component: update.component,
    designReference: update.designReference,
    viewport: update.viewport,
  };
}
