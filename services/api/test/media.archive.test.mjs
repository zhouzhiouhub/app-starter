import assert from "node:assert/strict";
import test from "node:test";
import { MediaService } from "../dist/modules/media/media.service.js";

const actor = {
  id: "user-1",
  tenantId: "tenant-1",
  email: "admin@example.com",
  name: "Admin",
  scopes: ["media:write"],
};

test("media service archives assets that are not referenced", async () => {
  const baseAsset = createAsset();
  const service = new MediaService({
    mediaAsset: {
      findFirst(options) {
        assert.deepEqual(options.where, {
          id: "asset-1",
          tenantId: "tenant-1",
        });
        return Promise.resolve(baseAsset);
      },
      update(options) {
        assert.equal(options.where.id, "asset-1");
        assert.equal(typeof options.data.metadata.archivedAt, "string");
        assert.equal(options.data.metadata.archivedBy, "user-1");
        return Promise.resolve({
          ...baseAsset,
          metadata: options.data.metadata,
        });
      },
    },
    pageVersion: {
      findMany() {
        return Promise.resolve([]);
      },
    },
  });

  const result = await service.archive("asset-1", actor);

  assert.equal(result.data.status, "archived");
  assert.equal(result.data.metadata.archivedBy, "user-1");
});

test("media service stores archive responses by idempotency key", async () => {
  const idempotencyCalls = [];
  const service = new MediaService({
    idempotencyRecord: {
      findUnique(options) {
        idempotencyCalls.push(["findUnique", options.where]);
        return Promise.resolve(null);
      },
      create(options) {
        idempotencyCalls.push(["create", options.data.scope]);
        return Promise.resolve({ id: "idem-1" });
      },
      update(options) {
        idempotencyCalls.push(["update", options.data.status]);
        assert.equal(options.data.response.data.id, "asset-1");
        return Promise.resolve(options.data);
      },
      deleteMany() {
        throw new Error("deleteMany should not run for successful archive.");
      },
    },
    mediaAsset: {
      findFirst() {
        return Promise.resolve(createAsset());
      },
      update(options) {
        return Promise.resolve(
          createAsset({
            metadata: options.data.metadata,
          }),
        );
      },
    },
    pageVersion: {
      findMany() {
        return Promise.resolve([]);
      },
    },
  });

  const result = await service.archive(
    "asset-1",
    actor,
    "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
  );

  assert.equal(result.data.status, "archived");
  assert.deepEqual(idempotencyCalls, [
    [
      "findUnique",
      {
        tenantId_scope_key: {
          tenantId: "tenant-1",
          scope: "media:asset-1:archive",
          key: "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
        },
      },
    ],
    ["create", "media:asset-1:archive"],
    ["update", "completed"],
  ]);
});

test("media service blocks archive when page versions reference the asset", async () => {
  const service = new MediaService({
    mediaAsset: {
      findFirst() {
        return Promise.resolve(createAsset());
      },
    },
    pageVersion: {
      findMany() {
        return Promise.resolve([
          {
            id: "version-1",
            version: 1,
            status: "draft",
            schema: {
              sections: [
                {
                  props: {
                    images: [{ src: "media://asset-1" }],
                  },
                },
              ],
            },
            page: {
              id: "page-1",
              slug: "home",
              title: "Home",
            },
          },
        ]);
      },
    },
  });

  await assert.rejects(
    () => service.archive("asset-1", actor),
    /Media asset is still referenced/,
  );
});

function createAsset(input = {}) {
  return {
    id: "asset-1",
    tenantId: "tenant-1",
    type: "image",
    filename: "hero.png",
    url: "https://cdn.example.com/hero.png",
    r2Key: "tenant-1/hero.png",
    size: 2048n,
    mimeType: "image/png",
    metadata: input.metadata ?? {},
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
  };
}
