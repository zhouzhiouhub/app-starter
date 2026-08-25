import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeMediaAsset } from "./media-smoke-upload-flow.mjs";
import { r2UploadUrl } from "./media-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("media smoke upload flow rejects configured CDN path prefix mismatches", async () => {
  const r2Key = "tenant-1/2026/08/21/smoke.png";

  await withFetch(async (url, init = {}) => {
    if (url.endsWith("/media/upload-url")) {
      return jsonResponse({
        data: {
          confirmPath: "/api/v1/media/confirm",
          expiresAt: "2026-08-21T00:15:00.000Z",
          headers: { "Content-Type": "image/png" },
          maxSize: 26214400,
          method: "PUT",
          r2Key,
          type: "image",
          uploadUrl: r2UploadUrl(`/bucket/${r2Key}`),
        },
      });
    }

    if (url === r2UploadUrl(`/bucket/${r2Key}`)) {
      return new Response("", { status: 200, statusText: "OK" });
    }

    if (url.endsWith("/media/confirm")) {
      const body = JSON.parse(init.body);
      return jsonResponse({
        data: {
          filename: body.filename,
          id: "asset-1",
          mimeType: body.mimeType,
          r2Key: body.r2Key,
          reference: "media://asset-1",
          size: body.size,
          status: "active",
          type: "image",
          url: `https://cdn.brand-assets.com/assets/${body.r2Key}`,
        },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }, async () => {
    await assert.rejects(
      () =>
        createSmokeMediaAsset(
          {
            apiBaseUrl: "https://api.example.com",
            expectedMediaCdnHost: "cdn.brand-assets.com",
            expectedMediaCdnPathPrefix: "/media",
            requireR2Upload: true,
          },
          "access-token",
        ),
      (error) => {
        assert.match(error.message, /CDN path/);
        assert.equal(error.smokeDetails.media.cdnHostMatchesExpected, true);
        assert.equal(error.smokeDetails.media.cdnPathMatchesExpected, false);
        assert.equal(
          error.smokeDetails.media.cdnPathname,
          `/assets/${r2Key}`,
        );
        assert.equal(error.smokeDetails.media.cdnUrlMatchesR2Key, true);
        assert.equal(
          error.smokeDetails.media.expectedCdnPathPrefix,
          "/media",
        );
        assert.equal(error.smokeDetails.media.productionCdn, true);
        assert.equal(error.smokeDetails.media.uploadedObject, true);
        assert.equal("uploadUrl" in error.smokeDetails.media, false);
        return true;
      },
    );
  });
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
  });
}
