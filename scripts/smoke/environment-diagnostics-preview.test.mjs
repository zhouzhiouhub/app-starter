import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports preview token secret readiness", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    PREVIEW_TOKEN_PREVIOUS_SECRET: "old-preview-secret",
    PREVIEW_TOKEN_SECRET: "new-preview-secret",
  });

  assert.deepEqual(diagnostics.preview, {
    configured: true,
    previousSecretConfigured: true,
    secretConfigured: true,
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("new-preview-secret"), false);
  assert.equal(serialized.includes("old-preview-secret"), false);
});

test("smoke environment diagnostics reports missing preview token secret", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    PREVIEW_TOKEN_SECRET: " ",
  });

  assert.deepEqual(diagnostics.preview, {
    configured: false,
    previousSecretConfigured: false,
    secretConfigured: false,
  });
});
