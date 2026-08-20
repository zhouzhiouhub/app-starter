import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  createFallbackPage,
} from "../../../packages/schema/dist/index.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";

test("publishPage rejects HTTP image sources before creating a version", async () => {
  const schema = createFallbackPage({ slug: "launch", title: "Launch" });
  schema.seo.ogImage = "http://cdn.example.com/og.jpg";
  schema.sections = [
    {
      id: "gallery",
      component: "image-gallery",
      props: {
        images: [
          { alt: "HTTP", src: "http://cdn.example.com/gallery.jpg" },
          { alt: "HTTPS", src: "https://cdn.example.com/gallery-2.jpg" },
          { alt: "Media", src: "media://asset-1" },
        ],
      },
      layout: {
        desktop: { x: 0, y: 0, width: 1200 },
        mobile: { x: 0, y: 0, width: 390 },
      },
    },
  ];
  const calls = {};

  await assert.rejects(
    () =>
      publishPage(
        createPublishPrisma(calls),
        "page-1",
        schema,
        undefined,
        createActor(),
      ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, apiErrorCodes.VALIDATION_ERROR);
      assert.deepEqual(error.getResponse().details.invalidImageSources, [
        { field: "seo.ogImage", reason: "http_requires_https" },
        {
          field: "sections[0].props.images[0].src",
          reason: "http_requires_https",
        },
      ]);

      return true;
    },
  );
  assert.equal(calls.versionCreate, undefined);
  assert.equal(calls.audit, undefined);
});

function createActor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    scopes: ["page:publish"],
    tenantId: "tenant-1",
  };
}

function createPublishPrisma(calls) {
  return {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async (input) => {
            calls.audit = input.data;
            return {};
          },
        },
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "launch",
            versions: [{ id: "version-1", status: "published", version: 1 }],
          }),
          update: async () => ({}),
        },
        pageVersion: {
          create: async (input) => {
            calls.versionCreate = input.data;

            return {
              id: "version-2",
              createdAt: new Date("2026-08-18T00:00:00.000Z"),
              publishedAt: input.data.publishedAt,
              status: input.data.status,
              version: input.data.version,
            };
          },
        },
        mediaAsset: {
          findMany: async () => [],
        },
      }),
    site: {
      findFirst: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };
}
