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

test("smoke environment diagnostics reports unsafe external media hosts", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    MEDIA_EXTERNAL_URL_HOSTS:
      "images.brand-assets.com, http://assets.brand-assets.com, https://user:secret@private.brand-assets.com, https://cdn.brand-assets.com/path?token=1, localhost, cdn.example.com, bad host",
  });

  assert.deepEqual(diagnostics.media.externalUrlHosts, [
    "images.brand-assets.com",
  ]);
  assert.equal(diagnostics.media.externalUrlHostsProductionReady, false);
  assert.deepEqual(diagnostics.media.externalUrlHostIssues, [
    {
      host: "assets.brand-assets.com",
      issue: "unsupported-protocol",
    },
    {
      host: "private.brand-assets.com",
      issue: "embedded-credentials",
    },
    {
      host: "cdn.brand-assets.com",
      issue: "unsupported-url-parts",
    },
    {
      host: "localhost",
      issue: "local-host",
    },
    {
      host: "cdn.example.com",
      issue: "placeholder-host",
    },
    {
      host: null,
      issue: "invalid-host",
    },
  ]);

  const serialized = JSON.stringify(diagnostics.media);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("token=1"), false);
});
