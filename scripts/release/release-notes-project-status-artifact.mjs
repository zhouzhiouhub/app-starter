import { readFile } from "node:fs/promises";
import { assertProjectStatusArtifact } from "../project/project-status-validation.mjs";

export async function readProjectStatusArtifact(path) {
  const artifact = JSON.parse(await readFile(path, "utf8"));
  assertProjectStatusArtifact(artifact);
  return artifact;
}
