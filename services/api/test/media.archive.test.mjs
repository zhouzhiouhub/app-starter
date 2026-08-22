import assert from "node:assert/strict";
import test from "node:test";
import { MediaService } from "../dist/modules/media/media.service.js";
import {
  createMediaActor,
  createMediaAsset,
} from "./media-test-helpers.mjs";

const actor = createMediaActor();

test("media service archives assets that are not referenced", async () => {
  const baseAsset = createMediaAsset();
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

  const result = await service.archive(
    "asset-1",
    actor,
    undefined,
    "request-media-archive",
  );

  assert.equal(result.data.status, "archived");
  assert.equal(result.data.metadata.archivedBy, "user-1");
  assert.equal(result.meta.requestId, "request-media-archive");
});

test("media service returns archived assets without rescanning usage", async () => {
  const archivedAt = "2026-08-19T00:00:00.000Z";
  const service = new MediaService({
    mediaAsset: {
      findFirst() {
        return Promise.resolve(
          createMediaAsset({
            metadata: {
              archivedAt,
              archivedBy: "user-previous",
            },
          }),
        );
      },
      update() {
        throw new Error("update should not run for archived assets");
      },
    },
    pageVersion: {
      findMany() {
        throw new Error("usage scan should not run for archived assets");
      },
    },
  });

  const result = await service.archive("asset-1", actor);

  assert.equal(result.data.status, "archived");
  assert.equal(result.data.archivedAt, archivedAt);
  assert.equal(result.data.metadata.archivedBy, "user-previous");
});

test("media service blocks archive when page versions reference the asset", async () => {
  const service = new MediaService({
    mediaAsset: {
      findFirst() {
        return Promise.resolve(createMediaAsset());
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
