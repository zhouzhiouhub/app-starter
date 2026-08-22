import assert from "node:assert/strict";
import test from "node:test";
import { MediaService } from "../dist/modules/media/media.service.js";
import {
  createMediaActor,
  createMediaAsset,
} from "./media-test-helpers.mjs";

const actor = createMediaActor({ scopes: ["media:read"] });

test("media service lists type and status filtered assets with pagination", async () => {
  const calls = [];
  const service = new MediaService({
    mediaAsset: {
      count(options) {
        calls.push({ method: "count", options });

        return Promise.resolve(2);
      },
      findMany(options) {
        calls.push({ method: "findMany", options });

        return Promise.resolve([
          createTestAsset({
            filename: "gallery.png",
            id: "asset-active-2",
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
    "request-media-list",
  );

  const expectedWhere = {
    NOT: {
      metadata: {
        path: ["archivedAt"],
        string_contains: "",
      },
    },
    tenantId: "tenant-1",
    type: "image",
  };

  assert.deepEqual(calls, [
    {
      method: "count",
      options: { where: expectedWhere },
    },
    {
      method: "findMany",
      options: {
        orderBy: { createdAt: "desc" },
        skip: 1,
        take: 1,
        where: expectedWhere,
      },
    },
  ]);
  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.page, 2);
  assert.equal(result.meta.limit, 1);
  assert.equal(result.meta.requestId, "request-media-list");
  assert.deepEqual(
    result.data.map((asset) => asset.id),
    ["asset-active-2"],
  );
});

test("media service filters archived assets in the database query", async () => {
  const archivedAt = new Date("2026-08-18T00:00:00.000Z").toISOString();
  const calls = [];
  const service = new MediaService({
    mediaAsset: {
      count(options) {
        calls.push({ method: "count", options });

        return Promise.resolve(1);
      },
      findMany(options) {
        calls.push({ method: "findMany", options });

        return Promise.resolve([
          createTestAsset({
            filename: "old.png",
            id: "asset-archived",
            metadata: { archivedAt },
            type: "image",
          }),
        ]);
      },
    },
  });

  const result = await service.list(
    {
      status: "archived",
    },
    actor,
    "request-media-archived-list",
  );

  const expectedWhere = {
    metadata: {
      path: ["archivedAt"],
      string_contains: "",
    },
    tenantId: "tenant-1",
  };

  assert.deepEqual(calls, [
    {
      method: "count",
      options: { where: expectedWhere },
    },
    {
      method: "findMany",
      options: {
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
        where: expectedWhere,
      },
    },
  ]);
  assert.equal(result.meta.total, 1);
  assert.equal(result.data[0].status, "archived");
});

function createTestAsset(input) {
  return createMediaAsset(input);
}
