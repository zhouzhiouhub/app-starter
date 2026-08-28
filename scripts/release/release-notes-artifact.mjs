import { readFile } from "node:fs/promises";
import { releaseEvidenceCheckSchemaVersion } from "./release-check-artifact.mjs";

export async function readReleaseEvidenceCheckArtifact(path) {
  const artifact = JSON.parse(await readFile(path, "utf8"));
  assertReleaseEvidenceCheckArtifact(artifact);
  return artifact;
}

export function assertReleaseEvidenceCheckArtifact(artifact) {
  if (!isPlainRecord(artifact)) {
    throw new Error("Release check artifact must be an object.");
  }

  if (artifact.schemaVersion !== releaseEvidenceCheckSchemaVersion) {
    throw new Error(
      `Release check artifact schemaVersion must be ${releaseEvidenceCheckSchemaVersion}.`,
    );
  }

  if (artifact.status !== "ready" && artifact.status !== "blocked") {
    throw new Error("Release check artifact status must be ready or blocked.");
  }

  if (typeof artifact.releaseReady !== "boolean") {
    throw new Error("Release check artifact releaseReady must be boolean.");
  }

  if (!isPlainRecord(artifact.smoke) || !isPlainRecord(artifact.visual)) {
    throw new Error("Release check artifact must include smoke and visual objects.");
  }

  if (!Array.isArray(artifact.blockers)) {
    throw new Error("Release check artifact blockers must be an array.");
  }
}

function isPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
