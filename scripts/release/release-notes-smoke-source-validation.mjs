import {
  assertNullableString,
  isPlainRecord,
} from "./release-notes-artifact-assertions.mjs";

export function assertSmokeSourceArtifact(source) {
  if (!isPlainRecord(source)) {
    throw new Error("Release check artifact smoke.source must be an object.");
  }

  assertNullableString(source.commitSha, "smoke.source.commitSha");
  assertNullableString(source.repository, "smoke.source.repository");
  assertNullableString(source.runId, "smoke.source.runId");
  assertNullableString(source.runNumber, "smoke.source.runNumber");
  assertNullableString(source.workflow, "smoke.source.workflow");
  assertNullableString(source.workflowRunUrl, "smoke.source.workflowRunUrl");
}

export function hasReadySmokeSourceArtifact(source) {
  return Boolean(
    source?.commitSha &&
      source?.repository &&
      source?.runId &&
      source?.workflowRunUrl,
  );
}
