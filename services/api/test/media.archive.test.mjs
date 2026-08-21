import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import { MediaService } from "../dist/modules/media/media.service.js";
import { withEnv } from "./env-helper.mjs";

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

test("media service returns request ids for confirmed and listed assets", async () => {
  const asset = createAsset({
    id: "asset-confirmed",
    metadata: { alt: "Hero" },
  });
  const service = new MediaService({
    mediaAsset: {
      create(options) {
        assert.equal(options.data.r2Key, "tenant-1/imports/hero.png");
        return Promise.resolve(asset);
      },
      findFirst(options) {
        assert.deepEqual(options.where, {
          r2Key: "tenant-1/imports/hero.png",
          tenantId: "tenant-1",
        });
        return Promise.resolve(null);
      },
      findMany(options) {
        assert.deepEqual(options.where, {
          tenantId: "tenant-1",
        });
        return Promise.resolve([asset]);
      },
    },
  });

  const confirmed = await service.confirm(
    {
      filename: "hero.png",
      mimeType: "image/png",
      r2Key: "tenant-1/imports/hero.png",
      size: 2048,
    },
    undefined,
    actor,
    "request-media-confirm",
  );
  const listed = await service.list({}, actor, "request-media-list");

  assert.equal(confirmed.meta.requestId, "request-media-confirm");
  assert.equal(listed.meta.requestId, "request-media-list");
  assert.equal(listed.data[0].id, "asset-confirmed");
});

test("media service rejects external registrations on managed CDN hosts", async () => {
  await withEnv(
    {
      MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
      MEDIA_EXTERNAL_URL_HOSTS: undefined,
    },
    async () => {
      const service = new MediaService({});

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
    },
  );
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
