import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMediaListFilterDiagnostic,
  isCdnUrlForR2Key,
  isExpectedCdnPathPrefix,
  isMediaListResponseContainingAsset,
  isMediaReference,
  isProductionCdnUrl,
  readMediaListFilterDiagnostic,
} from "./media-smoke.mjs";

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
  assert.equal(isProductionCdnUrl("https://cdn.brand-assets.com/file.png"), true);
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

test("smoke helpers validate expected CDN path prefixes", () => {
  assert.equal(
    isExpectedCdnPathPrefix(
      "https://cdn.brand-assets.com/media/tenant/smoke.png",
      "media",
    ),
    true,
  );
  assert.equal(
    isExpectedCdnPathPrefix(
      "https://cdn.brand-assets.com/media-other/tenant/smoke.png",
      "/media",
    ),
    false,
  );
  assert.equal(
    isExpectedCdnPathPrefix(
      "https://cdn.brand-assets.com/tenant/smoke.png",
      "",
    ),
    true,
  );
});

test("smoke helpers validate media list filter responses", () => {
  const asset = createSmokeAsset();

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
    createSmokeAsset(),
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

function createSmokeAsset() {
  return {
    filename: "smoke.png",
    id: "asset-1",
    reference: "media://asset-1",
  };
}
