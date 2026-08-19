import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaSmokeDetails,
  formatMediaListFilterDiagnostic,
  isCdnUrlForR2Key,
  isMediaListResponseContainingAsset,
  isMediaReference,
  isProductionCdnUrl,
  isR2UploadUrl,
  readMediaListFilterDiagnostic,
} from "./media-smoke.mjs";

test("smoke helpers detect R2 upload URLs", () => {
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123",
    ),
    true,
  );
  assert.equal(
    isR2UploadUrl(
      "https://uploads.example.com/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(isR2UploadUrl("not-a-url"), false);
});

test("smoke helpers validate CDN URLs and media references", () => {
  assert.equal(
    isCdnUrlForR2Key(
      "https://cdn.example.com/tenant/2026/08/19/smoke.png",
      "tenant/2026/08/19/smoke.png",
    ),
    true,
  );
  assert.equal(
    isCdnUrlForR2Key(
      "https://cdn.example.com/tenant/2026/08/19/other.png",
      "tenant/2026/08/19/smoke.png",
    ),
    false,
  );
  assert.equal(isProductionCdnUrl("https://cdn.example.com/file.png"), true);
  assert.equal(isProductionCdnUrl("https://cdn.local.invalid/file.png"), false);
  assert.equal(
    isProductionCdnUrl("https://uploads.local.invalid/file.png"),
    false,
  );
  assert.equal(isMediaReference("media://asset_123"), true);
  assert.equal(isMediaReference("https://cdn.example.com/asset_123"), false);
});

test("smoke helpers validate media list filter responses", () => {
  const asset = {
    filename: "smoke.png",
    id: "asset-1",
    reference: "media://asset-1",
  };

  assert.equal(
    isMediaListResponseContainingAsset(
      {
        data: [
          {
            filename: "smoke.png",
            id: "asset-1",
            reference: "media://asset-1",
            status: "active",
            type: "image",
          },
        ],
      },
      asset,
    ),
    true,
  );
  assert.equal(
    isMediaListResponseContainingAsset(
      {
        data: [
          {
            filename: "smoke.png",
            id: "asset-1",
            reference: "media://asset-1",
            status: "archived",
            type: "image",
          },
        ],
      },
      asset,
    ),
    false,
  );
  assert.equal(isMediaListResponseContainingAsset({ data: [] }, asset), false);
});

test("smoke helpers summarize media list filter mismatches", () => {
  const asset = {
    filename: "smoke.png",
    id: "asset-1",
    reference: "media://asset-1",
  };
  const diagnostic = readMediaListFilterDiagnostic(
    {
      data: [
        {
          filename: "smoke.png",
          id: "asset-1",
          reference: "media://asset-1",
          status: "archived",
          type: "image",
        },
        {
          filename: "other.png",
          id: "asset-2",
          reference: "media://asset-2",
          status: "active",
          type: "image",
        },
      ],
    },
    asset,
  );

  assert.deepEqual(diagnostic, {
    expectedAssetId: "asset-1",
    filenameMatches: true,
    idPresent: true,
    itemCount: 2,
    referenceMatches: true,
    status: "archived",
    type: "image",
  });
  assert.equal(
    formatMediaListFilterDiagnostic(diagnostic),
    "items: 2, expected asset: asset-1, id present: true, filename matches: true, reference matches: true, status: archived, type: image",
  );
});

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
      uploadUrl:
        "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=secret",
    },
    {
      id: "asset-1",
      mimeType: "image/png",
      r2Key: "tenant/2026/08/19/smoke.png",
      reference: "media://asset-1",
      size: 68,
      status: "active",
      type: "image",
      url: "https://cdn.example.com/tenant/2026/08/19/smoke.png",
    },
    true,
  );

  assert.deepEqual(details, {
    assetId: "asset-1",
    assetSize: 68,
    assetStatus: "active",
    assetType: "image",
    cdnHost: "cdn.example.com",
    cdnUrlMatchesR2Key: true,
    confirmPath: "/api/v1/media/confirm",
    isR2UploadUrl: true,
    presignedUrlHost: "account.r2.cloudflarestorage.com",
    productionCdn: true,
    r2Key: "tenant/2026/08/19/smoke.png",
    reference: "media://asset-1",
    uploadContentType: "image/png",
    uploadExpiresAt: "2026-08-19T10:00:00.000Z",
    uploadMaxSize: 26214400,
    uploadMethod: "PUT",
    uploadedObject: true,
  });
  assert.equal("uploadUrl" in details, false);
  assert.equal(JSON.stringify(details).includes("X-Amz-Signature"), false);
});
