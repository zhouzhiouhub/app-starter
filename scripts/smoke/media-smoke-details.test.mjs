import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaSmokeDetails,
  createMediaUploadTargetSmokeDetails,
} from "./media-smoke.mjs";
import { r2UploadUrl } from "./media-smoke-test-helpers.mjs";

test("smoke helpers summarize media checks without signed upload URLs", () => {
  const details = createMediaSmokeDetails(
    {
      confirmPath: "/api/v1/media/confirm",
      expiresAt: "2026-08-19T10:00:00.000Z",
      headers: {
        "Content-Type": "image/png",
      },
      maxSize: 26214400,
      method: "PUT",
      r2Key: "tenant/2026/08/19/smoke.png",
      type: "image",
      uploadUrl: r2UploadUrl("/bucket/tenant/2026/08/19/smoke.png"),
    },
    {
      id: "asset-1",
      mimeType: "image/png",
      r2Key: "tenant/2026/08/19/smoke.png",
      reference: "media://asset-1",
      size: 68,
      status: "active",
      type: "image",
      url: "https://cdn.brand-assets.com/tenant/2026/08/19/smoke.png",
    },
    true,
  );

  assert.deepEqual(details, {
    assetId: "asset-1",
    assetSize: 68,
    assetStatus: "active",
    assetType: "image",
    cdnHost: "cdn.brand-assets.com",
    cdnHostMatchesExpected: null,
    cdnUrlMatchesR2Key: true,
    confirmPath: "/api/v1/media/confirm",
    expectedCdnHost: null,
    isR2UploadUrl: true,
    presignedUrlHost: "account.r2.cloudflarestorage.com",
    productionCdn: true,
    r2Key: "tenant/2026/08/19/smoke.png",
    reference: "media://asset-1",
    uploadContentType: "image/png",
    uploadExpiresAt: "2026-08-19T10:00:00.000Z",
    uploadMaxSize: 26214400,
    uploadMethod: "PUT",
    uploadUrlMatchesR2Key: true,
    uploadedObject: true,
  });
  assert.equal("uploadUrl" in details, false);
  assert.equal(JSON.stringify(details).includes("X-Amz-Signature"), false);
});

test("smoke helpers summarize upload target failures without signed URLs", () => {
  const details = createMediaUploadTargetSmokeDetails({
    confirmPath: "/api/v1/media/confirm",
    expiresAt: "2026-08-19T10:00:00.000Z",
    headers: {
      "Content-Type": "image/png",
    },
    maxSize: 26214400,
    method: "PUT",
    r2Key: "tenant/2026/08/19/smoke.png",
    uploadUrl: r2UploadUrl("/bucket/tenant/2026/08/19/other.png"),
  });

  assert.deepEqual(details, {
    confirmPath: "/api/v1/media/confirm",
    isR2UploadUrl: true,
    presignedUrlHost: "account.r2.cloudflarestorage.com",
    r2Key: "tenant/2026/08/19/smoke.png",
    uploadContentType: "image/png",
    uploadExpiresAt: "2026-08-19T10:00:00.000Z",
    uploadMaxSize: 26214400,
    uploadMethod: "PUT",
    uploadUrlMatchesR2Key: false,
  });
  assert.equal("uploadUrl" in details, false);
  assert.equal(JSON.stringify(details).includes("X-Amz-Signature"), false);
});
