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
      findMany(options) {
        assertUsageScanQuery(options);
        return Promise.resolve([
          {
            id: "version-false-positive",
            version: 1,
            status: "draft",
            schema: {
              sections: [
                {
                  props: {
                    images: [{ src: "media://asset-10" }],
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
      findMany(options) {
        assertUsageScanQuery(options);
        return Promise.resolve([
          {
            id: "version-false-positive",
            version: 2,
            status: "published",
            schema: {
              sections: [
                {
                  props: {
                    images: [{ src: "media://asset-10" }],
                  },
                },
              ],
            },
            page: {
              id: "page-10",
              slug: "lookalike",
              title: "Lookalike",
            },
          },
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
    (error) => {
      assert.equal(error.getStatus(), 409);
      assert.equal(
        error.getResponse().message,
        "Media asset is still referenced by page versions.",
      );
      assert.deepEqual(error.getResponse().details.usage, [
        {
          pageId: "page-1",
          pageSlug: "home",
          pageTitle: "Home",
          versionId: "version-1",
          version: 1,
          status: "draft",
        },
      ]);
      return true;
    },
  );
});

test("media service limits archive usage details", async () => {
  const service = new MediaService({
    mediaAsset: {
      findFirst() {
        return Promise.resolve(createMediaAsset());
      },
      update() {
        throw new Error("referenced assets must not be archived.");
      },
    },
    pageVersion: {
      findMany(options) {
        assertUsageScanQuery(options);
        return Promise.resolve(
          Array.from({ length: 12 }, (_value, index) => ({
            id: `version-${index + 1}`,
            version: index + 1,
            status: index % 2 === 0 ? "draft" : "published",
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
              id: `page-${index + 1}`,
              slug: `page-${index + 1}`,
              title: `Page ${index + 1}`,
            },
          })),
        );
      },
    },
  });

  await assert.rejects(
    () => service.archive("asset-1", actor),
    (error) => {
      const usage = error.getResponse().details.usage;

      assert.equal(error.getStatus(), 409);
      assert.equal(usage.length, 10);
      assert.equal(usage[0].versionId, "version-1");
      assert.equal(usage.at(-1).versionId, "version-10");
      return true;
    },
  );
});

function assertUsageScanQuery(options) {
  assert.deepEqual(options, {
    where: {
      page: {
        site: {
          tenantId: "tenant-1",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      page: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      schema: true,
      status: true,
      version: true,
    },
  });
}
