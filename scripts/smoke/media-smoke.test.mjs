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
  isR2UploadUrlForKey,
  readMediaListFilterDiagnostic,
} from "./media-smoke.mjs";

const r2SignedQuery = [
  "X-Amz-Algorithm=AWS4-HMAC-SHA256",
  "X-Amz-Credential=access%2F20260819%2Fauto%2Fs3%2Faws4_request",
  "X-Amz-Date=20260819T000000Z",
  "X-Amz-Expires=900",
  "X-Amz-SignedHeaders=content-type%3Bhost",
  "X-Amz-Signature=abc123",
].join("&");

test("smoke helpers detect R2 upload URLs", () => {
  assert.equal(
    isR2UploadUrl(r2UploadUrl("/bucket/key")),
    true,
  );
  assert.equal(
    isR2UploadUrl(r2UploadUrl("/key", "https://uploads.example.com")),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      r2UploadUrl("/bucket/key", "http://account.r2.cloudflarestorage.com"),
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      r2UploadUrl(
        "/bucket/key",
        "https://user:pass@account.r2.cloudflarestorage.com",
      ),
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=access%2F20260819%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260819T000000Z&X-Amz-Expires=0&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(
    isR2UploadUrl(
      "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=access%2F20260819%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20260819T000000Z&X-Amz-Expires=901&X-Amz-SignedHeaders=content-type%3Bhost&X-Amz-Signature=abc123",
    ),
    false,
  );
  assert.equal(isR2UploadUrl("not-a-url"), false);
});

test("smoke helpers match R2 upload URLs to object keys", () => {
  assert.equal(
    isR2UploadUrlForKey(
      r2UploadUrl("/bucket/tenant/2026/08/19/smoke%20image.png"),
      "tenant/2026/08/19/smoke image.png",
    ),
    true,
  );
  assert.equal(
    isR2UploadUrlForKey(
      r2UploadUrl("/bucket/tenant/2026/08/19/other.png"),
      "tenant/2026/08/19/smoke.png",
    ),
    false,
  );
  assert.equal(
    isR2UploadUrlForKey(
      r2UploadUrl(
        "/tenant/2026/08/19/smoke.png",
        "https://uploads.example.com",
      ),
      "tenant/2026/08/19/smoke.png",
    ),
    false,
  );
});

test("smoke helpers validate CDN URLs and media references", () => {
  assert.equal(
    isCdnUrlForR2Key(
      "https://cdn.brand-assets.com/tenant/2026/08/19/smoke.png",
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
  assert.equal(
    isProductionCdnUrl("https://cdn.brand-assets.com/file.png"),
    true,
  );
  assert.equal(isProductionCdnUrl("https://cdn.example.com/file.png"), false);
  assert.equal(isProductionCdnUrl("http://cdn.example.com/file.png"), false);
  assert.equal(isProductionCdnUrl("https://localhost/file.png"), false);
  assert.equal(isProductionCdnUrl("https://127.0.0.1/file.png"), false);
  assert.equal(isProductionCdnUrl("https://10.0.0.1/file.png"), false);
  assert.equal(
    isProductionCdnUrl("https://user:pass@cdn.example.com/file.png"),
    false,
  );
  assert.equal(
    isProductionCdnUrl("https://cdn.example.com/file.png?token=1"),
    false,
  );
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
    uploadUrlMatchesR2Key: true,
    uploadedObject: true,
  });
  assert.equal("uploadUrl" in details, false);
  assert.equal(JSON.stringify(details).includes("X-Amz-Signature"), false);
});

function r2UploadUrl(
  path,
  origin = "https://account.r2.cloudflarestorage.com",
) {
  return `${origin}${path}?${r2SignedQuery}`;
}
