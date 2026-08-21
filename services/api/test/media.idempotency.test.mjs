import assert from "node:assert/strict";
import test from "node:test";
import { MediaService } from "../dist/modules/media/media.service.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  scopes: ["media:write"],
  tenantId: "tenant-1",
};

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
          key: "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
          scope: "media:asset-1:archive",
          tenantId: "tenant-1",
        },
      },
    ],
    ["create", "media:asset-1:archive"],
    ["update", "completed"],
  ]);
});

test("media service does not store signed upload URLs by idempotency key", async () => {
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
        assert.equal("response" in options.data, false);
        storedRecord = {
          ...storedRecord,
          response: options.data.response ?? null,
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

  const first = await service.createUploadUrl(
    input,
    key,
    actor,
    "request-media-upload",
  );

  assert.match(first.data.r2Key, /^tenant-1\//);
  assert.equal(typeof first.data.uploadUrl, "string");
  await assert.rejects(
    () => service.createUploadUrl(input, key, actor),
    /Response for this Idempotency-Key is not replayable/,
  );
  assert.equal(first.meta.requestId, "request-media-upload");
  assert.deepEqual(idempotencyCalls, [
    ["findUnique", "media:upload-url"],
    ["create", "media:upload-url"],
    ["update", "completed"],
    ["findUnique", "media:upload-url"],
  ]);
});

function createAsset(input = {}) {
  return {
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
    filename: "hero.png",
    id: input.id ?? "asset-1",
    metadata: input.metadata ?? {},
    mimeType: "image/png",
    r2Key: "tenant-1/hero.png",
    size: 2048n,
    tenantId: "tenant-1",
    type: "image",
    url: "https://cdn.example.com/hero.png",
  };
}
