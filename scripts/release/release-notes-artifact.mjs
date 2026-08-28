import { readFile } from "node:fs/promises";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact-validation.mjs";

export { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact-validation.mjs";

export async function readReleaseEvidenceCheckArtifact(path) {
  const artifact = JSON.parse(await readFile(path, "utf8"));
  assertReleaseEvidenceCheckArtifact(artifact);
  return artifact;
}
