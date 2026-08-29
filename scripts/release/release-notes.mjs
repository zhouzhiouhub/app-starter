import { readReleaseNotesCliConfig } from "./release-notes-config.mjs";
import { readReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";
import { readProjectStatusArtifact } from "./release-notes-project-status-artifact.mjs";
import {
  createReleaseNotesMarkdown,
  writeReleaseNotesMarkdown,
} from "./release-notes-report.mjs";

export {
  createReleaseNotesMarkdown,
  readProjectStatusArtifact,
  readReleaseEvidenceCheckArtifact,
  readReleaseNotesCliConfig,
  writeReleaseNotesMarkdown,
};

export async function createReleaseNotesFromConfig(config) {
  const [artifact, projectStatus] = await Promise.all([
    readReleaseEvidenceCheckArtifact(config.releaseCheckPath),
    readProjectStatusArtifact(config.projectStatusPath),
  ]);

  return createReleaseNotesMarkdown(config, artifact, projectStatus);
}
