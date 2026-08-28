import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptySmokeSourceMetadata,
  normalizeSmokeSourceMetadata,
  readMissingSmokeSourceFields,
  readSmokeSourceMetadata,
} from "./smoke-source-metadata.mjs";

const commitSha = "ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD";

test("smoke source metadata reads GitHub Actions context", () => {
  assert.deepEqual(
    readSmokeSourceMetadata({
      GITHUB_REPOSITORY: "zhouzhiouhub/app-starter",
      GITHUB_RUN_ID: "123456789",
      GITHUB_RUN_NUMBER: "123",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_SHA: commitSha,
      GITHUB_WORKFLOW: "Production Smoke",
    }),
    {
      commitSha: commitSha.toLowerCase(),
      repository: "zhouzhiouhub/app-starter",
      runId: "123456789",
      runNumber: "123",
      workflow: "Production Smoke",
      workflowRunUrl:
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
    },
  );
});

test("smoke source metadata allows explicit smoke source overrides", () => {
  assert.deepEqual(
    readSmokeSourceMetadata({
      GITHUB_REPOSITORY: "wrong/repo",
      GITHUB_RUN_ID: "1",
      GITHUB_SHA: "0123456789abcdef0123456789abcdef01234567",
      SMOKE_SOURCE_COMMIT_SHA: commitSha,
      SMOKE_SOURCE_REPOSITORY: "brand/app-starter",
      SMOKE_SOURCE_RUN_ID: "987654321",
      SMOKE_SOURCE_RUN_NUMBER: "456",
      SMOKE_SOURCE_WORKFLOW: "Manual Production Smoke",
      SMOKE_SOURCE_WORKFLOW_RUN_URL:
        "https://github.com/brand/app-starter/actions/runs/987654321",
    }),
    {
      commitSha: commitSha.toLowerCase(),
      repository: "brand/app-starter",
      runId: "987654321",
      runNumber: "456",
      workflow: "Manual Production Smoke",
      workflowRunUrl:
        "https://github.com/brand/app-starter/actions/runs/987654321",
    },
  );
});

test("smoke source metadata rejects unsafe GitHub server URLs", () => {
  const metadata = readSmokeSourceMetadata({
    GITHUB_REPOSITORY: "zhouzhiouhub/app-starter",
    GITHUB_RUN_ID: "123456789",
    GITHUB_SERVER_URL: "https://github.com/actions",
    GITHUB_SHA: commitSha,
  });

  assert.equal(metadata.workflowRunUrl, null);
});

test("smoke source metadata normalizes invalid values to null", () => {
  assert.deepEqual(
    normalizeSmokeSourceMetadata({
      commitSha: "not-a-sha",
      repository: "brand",
      runId: "abc",
      runNumber: "12 ",
      workflow: " Production Smoke",
      workflowRunUrl: "https://github.com/brand/app/actions?run=123",
    }),
    createEmptySmokeSourceMetadata(),
  );
});

test("smoke source metadata reports missing required fields", () => {
  assert.deepEqual(readMissingSmokeSourceFields(null), [
    "commitSha",
    "repository",
    "runId",
    "workflowRunUrl",
  ]);
  assert.deepEqual(
    readMissingSmokeSourceFields({
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      repository: "brand/app-starter",
      runId: "123",
      workflowRunUrl: "https://github.com/brand/app-starter/actions/runs/123",
    }),
    [],
  );
});
