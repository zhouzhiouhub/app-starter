import assert from "node:assert/strict";
import test from "node:test";
import { listAllMediaAssetPages } from "../src/features/media/media-list-pagination.ts";

test("media list pagination loads all active assets for resolver use", async () => {
  const calls = [];
  const assets = await listAllMediaAssetPages(async (page, limit) => {
    calls.push({ limit, page });

    if (page === 1) {
      return {
        data: [createAsset("asset-1"), createAsset("asset-2")],
        meta: {
          limit,
          page,
          total: 3,
        },
      };
    }

    return {
      data: [createAsset("asset-3")],
      meta: {
        limit,
        page,
        total: 3,
      },
    };
  }, 100);

  assert.deepEqual(
    assets.map((asset) => asset.reference),
    ["media://asset-1", "media://asset-2", "media://asset-3"],
  );
  assert.deepEqual(calls, [
    { limit: 100, page: 1 },
    { limit: 100, page: 2 },
  ]);
});

function createAsset(id) {
  return {
    archivedAt: null,
    createdAt: "2026-08-20T00:00:00.000Z",
    filename: `${id}.jpg`,
    id,
    metadata: {},
    mimeType: "image/jpeg",
    r2Key: `tenant/media/${id}.jpg`,
    reference: `media://${id}`,
    size: 100,
    status: "active",
    type: "image",
    url: `https://cdn.example.com/${id}.jpg`,
  };
}
