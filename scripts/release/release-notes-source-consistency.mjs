import { normalizeWorkflowRunUrl } from "./release-notes-validation.mjs";

export function assertReleaseNotesSourceConsistency(config, artifact) {
  const source = artifact?.smoke?.source;

  assertWorkflowRunUrlMatchesSource(config, source);
  assertSmokeArtifactMatchesSource(config, source);
}

function assertWorkflowRunUrlMatchesSource(config, source) {
  if (!source?.workflowRunUrl) {
    return;
  }

  if (normalizeWorkflowRunUrl(source.workflowRunUrl) !== config.workflowRunUrl) {
    throw new Error(
      "Release notes workflow run URL must match smoke.source.workflowRunUrl.",
    );
  }
}

function assertSmokeArtifactMatchesSource(config, source) {
  if (!source?.runNumber) {
    return;
  }

  const expected = `production-smoke-report-${source.runNumber}`;

  if (config.smokeArtifact !== expected) {
    throw new Error(
      "Release notes smoke artifact must match smoke.source.runNumber.",
    );
  }
}
