import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";
import { defaultPageBuilderVisualReferenceSourceDir } from "../visual/page-builder-visual-acceptance-actions.mjs";
import {
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";

const defaultVisualEvidenceAction =
  "Run pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture " +
  "to refresh retained fixture evidence, run pnpm visual:acceptance -- --checklist, attach real design references " +
  "and browser screenshots, run pnpm visual:measure -- --write --require-complete, " +
  "run pnpm visual:measure -- --write --accept-passing --require-complete after review passes, " +
  "then pnpm visual:acceptance -- --require-accepted.";

export const visualArtifactAction =
  "Run pnpm visual:artifact-check against the downloaded Page Builder Visual " +
  "artifact, then rerun Production Smoke with a complete artifact pair.";

export function createVisualEvidenceAction(artifact) {
  if (artifact?.status !== "complete" || !artifact.artifactDir) {
    return defaultVisualEvidenceAction;
  }

  const paths = createArtifactPaths(artifact.artifactDir);
  const commandReport = {
    manifestPath: paths.manifest,
    sourceDir: defaultPageBuilderVisualReferenceSourceDir,
  };

  return [
    "Fixture artifact is complete.",
    `Attach real design references under ${commandReport.sourceDir},`,
    `run ${createPageBuilderVisualReferenceImportWriteCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceCaptureCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceMeasureCommand(commandReport)},`,
    `run ${createPageBuilderVisualReferenceAcceptPassingCommand(commandReport)} after review passes,`,
    `then ${createPageBuilderVisualReferenceAcceptanceCommand(commandReport)}.`,
  ].join(" ");
}
