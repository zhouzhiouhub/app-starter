import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";
import { readCdnDiagnostics } from "./environment-diagnostics-media-cdn.mjs";

test("smoke environment diagnostics rejects file-like CDN base paths", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://media.brand-assets.com/media/hero.png",
  });

  assert.equal(diagnostics.media.cdnHost, "media.brand-assets.com");
  assert.equal(diagnostics.media.cdnUrlIssue, "file-path");
  assert.equal(diagnostics.media.cdnProductionReady, false);
  assert.equal(diagnostics.media.cdnUrlSafe, false);
  assert.equal(diagnostics.media.cdnUsesLocalFallback, false);
});

test("smoke environment diagnostics rejects control characters in CDN bases", () => {
  assert.deepEqual(readCdnDiagnostics("https://cdn.brand-assets.com\t"), {
    host: null,
    issue: "control-character",
    localHost: false,
    productionReady: false,
    safe: false,
  });

  assert.deepEqual(readCdnDiagnostics("https://cdn.brand-assets.com/media%0a"), {
    host: "cdn.brand-assets.com",
    issue: "control-character",
    localHost: false,
    productionReady: false,
    safe: false,
  });
});
