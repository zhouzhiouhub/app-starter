import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import { MediaService } from "../dist/modules/media/media.service.js";
import { withEnv } from "./env-helper.mjs";

test("media service resolves media references in page schemas", () =>
  withMediaCdnEnv(async () => {
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
  }));

test("media service leaves archived media references unresolved", () =>
  withMediaCdnEnv(async () => {
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
  }));

test("media service leaves disallowed media URLs unresolved", () =>
  withMediaCdnEnv(async () => {
    const service = new MediaService({
      mediaAsset: {
        findMany(options) {
          assert.deepEqual(options.where, {
            id: { in: ["asset-clean", "asset-dirty"] },
            tenantId: "tenant-1",
          });

          return Promise.resolve([
            {
              id: "asset-clean",
              metadata: {},
              url: "https://cdn.example.com/clean.webp",
            },
            {
              id: "asset-dirty",
              metadata: {},
              url: "https://untrusted.example.net/dirty.webp",
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
                { alt: "Clean", src: "media://asset-clean" },
                { alt: "Dirty", src: "media://asset-dirty" },
              ],
            },
            layout: {},
          },
        ],
        seo: {
          ...schema.seo,
          ogImage: "media://asset-dirty",
        },
      },
      "tenant-1",
    );

    assert.equal(resolved.seo.ogImage, "media://asset-dirty");
    assert.equal(
      resolved.sections[0].props.images[0].src,
      "https://cdn.example.com/clean.webp",
    );
    assert.equal(
      resolved.sections[0].props.images[1].src,
      "media://asset-dirty",
    );
  }));

function withMediaCdnEnv(fn) {
  return withEnv(
    {
      APP_ENV: undefined,
      CDN_BASE_URL: undefined,
      MEDIA_CDN_BASE_URL: "https://cdn.example.com",
      MEDIA_EXTERNAL_URL_HOSTS: undefined,
      NODE_ENV: "test",
      VERCEL_ENV: undefined,
    },
    fn,
  );
}
