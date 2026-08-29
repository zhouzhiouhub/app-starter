import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";

const defaultVisualEvidenceAction =
  "Run pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture " +
  "to refresh retained fixture evidence, run pnpm visual:acceptance -- --checklist, attach real design references " +
  "and browser screenshots, run pnpm visual:measure -- --write --require-complete, " +
  "then pnpm visual:acceptance -- --require-accepted.";

export const visualArtifactAction =
  "Run pnpm visual:artifact-check against the downloaded Page Builder Visual " +
  "artifact, then rerun Production Smoke with a complete artifact pair.";

export function createVisualEvidenceAction(artifact) {
  if (artifact?.status !== "complete" || !artifact.artifactDir) {
    return defaultVisualEvidenceAction;
  }

  const paths = createArtifactPaths(artifact.artifactDir);

  return [
    "Fixture artifact is complete.",
    "Attach real design references under docs/visual/page-builder-references,",
    `run pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest ${paths.manifest} --write --require-complete,`,
    `run pnpm visual:measure -- --manifest ${paths.manifest} --write --require-complete,`,
    `then pnpm visual:acceptance -- --require-accepted ${paths.manifest}.`,
  ].join(" ");
}
