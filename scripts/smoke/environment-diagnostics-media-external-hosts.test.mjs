import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics rejects control characters in external media hosts", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    MEDIA_EXTERNAL_URL_HOSTS:
      "images.brand-assets.com\t, images.brand-assets.com\n.evil.com, https://assets.brand-assets.com\t.evil.com, cdn.brand-assets.com",
  });

  assert.deepEqual(diagnostics.media.externalUrlHosts, [
    "cdn.brand-assets.com",
  ]);
  assert.equal(diagnostics.media.externalUrlHostsProductionReady, false);
  assert.deepEqual(diagnostics.media.externalUrlHostIssues, [
    {
      host: null,
      issue: "control-character",
    },
    {
      host: null,
      issue: "control-character",
    },
    {
      host: null,
      issue: "control-character",
    },
  ]);
});
