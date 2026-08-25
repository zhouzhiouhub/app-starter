import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

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
