import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import { MediaService } from "../dist/modules/media/media.service.js";

test("media service resolves media references in page schemas", async () => {
  const service = new MediaService({
    mediaAsset: {
      findMany(options) {
        assert.deepEqual(options.where, {
          id: { in: ["asset-1"] },
          tenantId: "tenant-1",
        });

        return Promise.resolve([
          {
            id: "asset-1",
            metadata: {},
            url: "https://cdn.example.com/hero.webp",
          },
        ]);
      },
    },
  });
  const schema = createFallbackPage({ slug: "gallery" });
  const resolved = await service.resolveSchemaMediaReferences(
    {
      ...schema,
      sections: [
        {
          id: "gallery",
          component: "image-gallery",
          props: {
            images: [{ alt: "Hero", src: "media://asset-1" }],
          },
          layout: {},
        },
      ],
      seo: {
        ...schema.seo,
        ogImage: "media://asset-1",
      },
    },
    "tenant-1",
  );

  assert.equal(resolved.seo.ogImage, "https://cdn.example.com/hero.webp");
  assert.equal(
    resolved.sections[0].props.images[0].src,
    "https://cdn.example.com/hero.webp",
  );
});

test("media service leaves archived media references unresolved", async () => {
  const service = new MediaService({
    mediaAsset: {
      findMany(options) {
        assert.deepEqual(options.where, {
          id: { in: ["asset-active", "asset-archived", "asset-missing"] },
          tenantId: "tenant-1",
        });
        assert.deepEqual(options.select, {
          id: true,
          metadata: true,
          url: true,
        });

        return Promise.resolve([
          {
            id: "asset-active",
            metadata: {},
            url: "https://cdn.example.com/active.webp",
          },
          {
            id: "asset-archived",
            metadata: {
              archivedAt: "2026-08-23T00:00:00.000Z",
            },
            url: "https://cdn.example.com/archived.webp",
          },
        ]);
      },
    },
  });
  const schema = createFallbackPage({ slug: "gallery" });
  const resolved = await service.resolveSchemaMediaReferences(
    {
      ...schema,
      sections: [
        {
          id: "gallery",
          component: "image-gallery",
          props: {
            images: [
              { alt: "Active", src: "media://asset-active" },
              { alt: "Archived", src: "media://asset-archived" },
              { alt: "Missing", src: "media://asset-missing" },
            ],
          },
          layout: {},
        },
      ],
      seo: {
        ...schema.seo,
        ogImage: "media://asset-archived",
      },
    },
    "tenant-1",
  );

  assert.equal(resolved.seo.ogImage, "media://asset-archived");
  assert.equal(
    resolved.sections[0].props.images[0].src,
    "https://cdn.example.com/active.webp",
  );
  assert.equal(
    resolved.sections[0].props.images[1].src,
    "media://asset-archived",
  );
  assert.equal(
    resolved.sections[0].props.images[2].src,
    "media://asset-missing",
  );
});
