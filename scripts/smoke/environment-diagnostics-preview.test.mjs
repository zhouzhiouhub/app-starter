import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports preview token secret readiness", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    PREVIEW_TOKEN_PREVIOUS_SECRET: "old-preview-secret-value-123456789",
    PREVIEW_TOKEN_SECRET: "new-preview-secret-value-123456789",
  });

  assert.deepEqual(diagnostics.preview, {
    configured: true,
    previousSecretConfigured: true,
    previousSecretIssue: null,
    previousSecretSafe: true,
    secretConfigured: true,
    secretIssue: null,
    secretSafe: true,
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("new-preview-secret-value"), false);
  assert.equal(serialized.includes("old-preview-secret-value"), false);
});

test("smoke environment diagnostics reports missing preview token secret", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    PREVIEW_TOKEN_SECRET: " ",
  });

  assert.deepEqual(diagnostics.preview, {
    configured: false,
    previousSecretConfigured: false,
    previousSecretIssue: null,
    previousSecretSafe: true,
    secretConfigured: false,
    secretIssue: "missing-secret",
    secretSafe: false,
  });
});

test("smoke environment diagnostics reports unsafe preview token secrets", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    PREVIEW_TOKEN_PREVIOUS_SECRET: "previous\rsecret-value-12345678901234",
    PREVIEW_TOKEN_SECRET: "short-preview-secret",
  });

  assert.deepEqual(diagnostics.preview, {
    configured: false,
    previousSecretConfigured: true,
    previousSecretIssue: "control-character",
    previousSecretSafe: false,
    secretConfigured: true,
    secretIssue: "short-secret",
    secretSafe: false,
  });
});

test("smoke environment diagnostics reports trimmed preview control characters", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    PREVIEW_TOKEN_PREVIOUS_SECRET: `${"b".repeat(32)}\t`,
    PREVIEW_TOKEN_SECRET: `${"a".repeat(32)}\n`,
  });

  assert.deepEqual(diagnostics.preview, {
    configured: false,
    previousSecretConfigured: true,
    previousSecretIssue: "control-character",
    previousSecretSafe: false,
    secretConfigured: true,
    secretIssue: "control-character",
    secretSafe: false,
  });
});
