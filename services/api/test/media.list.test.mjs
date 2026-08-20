import assert from "node:assert/strict";
import test from "node:test";
import { MediaService } from "../dist/modules/media/media.service.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  scopes: ["media:read"],
  tenantId: "tenant-1",
};

test("media service lists type and status filtered assets with pagination", async () => {
  const createdAt = new Date("2026-08-18T00:00:00.000Z");
  const calls = [];
  const service = new MediaService({
    mediaAsset: {
      findMany(options) {
        calls.push(options);

        return Promise.resolve([
          createTestAsset({
            filename: "hero.png",
            id: "asset-active-1",
            type: "image",
          }),
          createTestAsset({
            filename: "gallery.png",
            id: "asset-active-2",
            type: "image",
          }),
          createTestAsset({
            filename: "old.png",
            id: "asset-archived",
            metadata: { archivedAt: createdAt.toISOString() },
            type: "image",
          }),
        ]);
      },
    },
  });

  const result = await service.list(
    {
      limit: "1",
      page: "2",
      status: "active",
      type: "image",
    },
    actor,
  );

  assert.deepEqual(calls[0], {
    orderBy: { createdAt: "desc" },
    where: { tenantId: "tenant-1", type: "image" },
  });
  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.page, 2);
  assert.equal(result.meta.limit, 1);
  assert.deepEqual(
    result.data.map((asset) => asset.id),
    ["asset-active-2"],
  );
});

function createTestAsset(input) {
  return {
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    filename: input.filename,
    id: input.id,
    metadata: input.metadata ?? {},
    mimeType: input.type === "image" ? "image/png" : "application/pdf",
    r2Key: `tenant-1/${input.filename}`,
    size: 2048n,
    type: input.type,
    url: `https://cdn.example.com/${input.filename}`,
  };
}
