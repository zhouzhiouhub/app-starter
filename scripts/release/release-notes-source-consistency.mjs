import { normalizeWorkflowRunUrl } from "./release-notes-validation.mjs";

export function assertReleaseNotesSourceConsistency(config, artifact) {
  const sourceRunUrl = artifact?.smoke?.source?.workflowRunUrl;

  if (!sourceRunUrl) {
    return;
  }

  if (normalizeWorkflowRunUrl(sourceRunUrl) !== config.workflowRunUrl) {
    throw new Error(
      "Release notes workflow run URL must match smoke.source.workflowRunUrl.",
    );
  }
}
