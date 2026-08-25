import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import test from "node:test";
import { assertMediaAssetShape } from "./media-smoke-confirmation.mjs";
import { r2UploadUrl } from "./media-smoke-test-helpers.mjs";

test("media confirm R2 key mismatches keep structured diagnostics", () => {
  const targetR2Key = "tenant-1/2026/08/21/smoke.png";
  const assetR2Key = "tenant-1/2026/08/21/other.png";

  const target = {
    confirmPath: "/api/v1/media/confirm",
    expiresAt: "2026-08-21T00:15:00.000Z",
    headers: { "Content-Type": "image/png" },
    maxSize: 26214400,
    method: "PUT",
    r2Key: targetR2Key,
    type: "image",
    uploadUrl: r2UploadUrl(`/bucket/${targetR2Key}`),
  };
  const image = {
    body: Buffer.from("x"),
    filename: "smoke.png",
    mimeType: "image/png",
  };
  const asset = {
    filename: image.filename,
    id: "asset-1",
    mimeType: image.mimeType,
    r2Key: assetR2Key,
    reference: "media://asset-1",
    size: image.body.byteLength,
    status: "active",
    type: "image",
    url: `https://cdn.brand-assets.com/media/${targetR2Key}`,
  };

  assert.throws(
    () =>
      assertMediaAssetShape(
        asset,
        target,
        image,
        true,
        "cdn.brand-assets.com",
        "/media",
      ),
    (error) => {
      const media = error.smokeDetails.media;

      assert.match(error.message, /unexpected R2 key/);
      assert.equal(media.assetR2KeyMatchesTarget, false);
      assert.equal(media.cdnUrlMatchesR2Key, true);
      assert.equal(media.r2Key, assetR2Key);
      assert.equal(media.targetR2Key, targetR2Key);
      assert.equal(media.uploadUrlMatchesR2Key, true);
      assert.equal("uploadUrl" in media, false);
      assert.equal(JSON.stringify(media).includes("X-Amz-Signature"), false);
      return true;
    },
  );
});
