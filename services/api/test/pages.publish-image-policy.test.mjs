import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  createFallbackPage,
} from "../../../packages/schema/dist/index.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { createPublishPrisma } from "./pages-publish-test-helpers.mjs";
import { createPageActor } from "./pages-test-helpers.mjs";

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
        createPageActor(),
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

test("publishPage rejects signed image URLs before creating a version", async () => {
  const schema = createFallbackPage({ slug: "launch", title: "Launch" });
  schema.sections = [
    {
      id: "gallery",
      component: "image-gallery",
      props: {
        images: [
          {
            alt: "Signed",
            src: "https://cdn.example.com/gallery.jpg?X-Amz-Signature=signed",
          },
          { alt: "HTTPS", src: "https://cdn.example.com/gallery-2.jpg" },
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
        createPageActor(),
      ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, apiErrorCodes.VALIDATION_ERROR);
      assert.deepEqual(error.getResponse().details.invalidImageSources, [
        {
          field: "sections[0].props.images[0].src",
          reason: "sensitive_query_parameter",
        },
      ]);

      return true;
    },
  );
  assert.equal(calls.versionCreate, undefined);
  assert.equal(calls.audit, undefined);
});
