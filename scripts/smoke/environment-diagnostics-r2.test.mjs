import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports unsafe R2 configuration", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    R2_ACCESS_KEY_ID: "access key",
    R2_ACCOUNT_ID: "bad account",
    R2_BUCKET: "../media-bucket",
    R2_REGION: "auto/us",
    R2_SECRET_ACCESS_KEY: "secret\rkey",
  });

  assert.equal(diagnostics.media.r2.configured, false);
  assert.deepEqual(diagnostics.media.r2.missingRequired, []);
  assert.equal(diagnostics.media.r2.region, "auto");
  assert.deepEqual(diagnostics.media.r2.issues, [
    {
      issue: "invalid-account-id",
      variable: "R2_ACCOUNT_ID",
    },
    {
      issue: "invalid-credential",
      variable: "R2_ACCESS_KEY_ID",
    },
    {
      issue: "invalid-bucket",
      variable: "R2_BUCKET",
    },
    {
      issue: "invalid-credential",
      variable: "R2_SECRET_ACCESS_KEY",
    },
    {
      issue: "invalid-region",
      variable: "R2_REGION",
    },
  ]);
});

test("smoke environment diagnostics rejects unsafe R2 bucket names", () => {
  for (const bucket of [
    "Media-Bucket",
    "media.-bucket",
    "media-.bucket",
    "192.168.0.1",
  ]) {
    const diagnostics = createSmokeEnvironmentDiagnostics({
      R2_ACCESS_KEY_ID: "access-key",
      R2_ACCOUNT_ID: "account-1",
      R2_BUCKET: bucket,
      R2_SECRET_ACCESS_KEY: "secret-key",
    });

    assert.equal(diagnostics.media.r2.configured, false, bucket);
    assert.deepEqual(
      diagnostics.media.r2.issues,
      [
        {
          issue: "invalid-bucket",
          variable: "R2_BUCKET",
        },
      ],
      bucket,
    );
  }
});
