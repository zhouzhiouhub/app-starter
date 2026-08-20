import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
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

test("media service stores upload URL responses by idempotency key", async () => {
  const idempotencyCalls = [];
  let storedRecord = null;
  const service = new MediaService({
    idempotencyRecord: {
      findUnique(options) {
        idempotencyCalls.push([
          "findUnique",
          options.where.tenantId_scope_key.scope,
        ]);
        return Promise.resolve(storedRecord);
      },
      create(options) {
        idempotencyCalls.push(["create", options.data.scope]);
        storedRecord = {
          id: "idem-1",
          requestHash: options.data.requestHash,
          response: null,
          status: "pending",
        };
        return Promise.resolve({ id: "idem-1" });
      },
      update(options) {
        idempotencyCalls.push(["update", options.data.status]);
        assert.match(options.data.response.data.r2Key, /^tenant-1\//);
        storedRecord = {
          ...storedRecord,
          response: options.data.response,
          status: options.data.status,
        };
        return Promise.resolve(storedRecord);
      },
      deleteMany() {
        throw new Error("deleteMany should not run for successful upload URL.");
      },
    },
  });
  const key = "8d0671c4-46f2-49e4-823f-69f9f6dd0ca3";
  const input = {
    filename: "hero.png",
    mimeType: "image/png",
    size: 2048,
  };

  const first = await service.createUploadUrl(input, key, actor);
  const second = await service.createUploadUrl(input, key, actor);

  assert.equal(first.data.r2Key, second.data.r2Key);
  assert.equal(first.data.uploadUrl, second.data.uploadUrl);
  assert.deepEqual(idempotencyCalls, [
    ["findUnique", "media:upload-url"],
    ["create", "media:upload-url"],
    ["update", "completed"],
    ["findUnique", "media:upload-url"],
  ]);
});

test("media service rejects external registrations on managed CDN hosts", async () => {
  const restoreEnv = setTestEnv({
    MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
    MEDIA_EXTERNAL_URL_HOSTS: undefined,
  });
  const service = new MediaService({});

  try {
    await assert.rejects(
      () =>
        service.confirm(
          {
            filename: "hero.png",
            mimeType: "image/png",
            r2Key: "tenant-1/imports/hero.png",
            size: 2048,
            url: "https://cdn.example.com/tenant-2/private.png",
          },
          undefined,
          actor,
        ),
      (error) => {
        assert.equal(error.getStatus(), 400);
        assert.equal(
          error.getResponse().message,
          "External media URL host is not allowed.",
        );
        return true;
      },
    );
  } finally {
    restoreEnv();
  }
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

test("media service blocks publishing schemas with missing or archived media", async () => {
  const schema = createFallbackPage({
    slug: "campaign",
    title: "Campaign",
  });
  schema.sections[0].props = {
    heroImage: "media://asset-1",
    gallery: ["media://asset-missing", "media://asset-archived"],
  };
  const service = new MediaService({
    mediaAsset: {
      findMany(options) {
        assert.deepEqual(options.where, {
          id: {
            in: ["asset-1", "asset-missing", "asset-archived"],
          },
          tenantId: "tenant-1",
        });
        return Promise.resolve([
          createAsset(),
          createAsset({
            id: "asset-archived",
            metadata: {
              archivedAt: "2026-08-19T00:00:00.000Z",
            },
          }),
        ]);
      },
    },
  });

  await assert.rejects(
    () => service.assertSchemaMediaReferencesPublishable(schema, "tenant-1"),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Page references missing or archived media assets.",
      );
      assert.deepEqual(error.getResponse().details, {
        archivedReferences: ["media://asset-archived"],
        missingReferences: ["media://asset-missing"],
      });
      return true;
    },
  );
});

function createAsset(input = {}) {
  return {
    id: input.id ?? "asset-1",
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

function setTestEnv(updates) {
  const previous = new Map();

  for (const key of Object.keys(updates)) {
    previous.set(key, process.env[key]);

    if (updates[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = updates[key];
    }
  }

  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}
