import { readReleaseNotesCliConfig } from "./release-notes-config.mjs";
import { readReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";
import {
  createReleaseNotesMarkdown,
  writeReleaseNotesMarkdown,
} from "./release-notes-report.mjs";

export {
  createReleaseNotesMarkdown,
  readReleaseEvidenceCheckArtifact,
  readReleaseNotesCliConfig,
  writeReleaseNotesMarkdown,
};

export async function createReleaseNotesFromConfig(config) {
  const artifact = await readReleaseEvidenceCheckArtifact(config.releaseCheckPath);
  return createReleaseNotesMarkdown(config, artifact);
}
