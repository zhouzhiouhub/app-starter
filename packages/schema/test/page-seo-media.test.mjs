import assert from "node:assert/strict";
import test from "node:test";
import {
  collectMediaReferences,
  pageSchema,
  pageMediaReferenceMaxCount,
  resolveMediaReferences,
} from "../dist/index.js";
import { minimalPage } from "./page-schema-test-helpers.mjs";

test("page schema accepts safe SEO URLs", () => {
  const parsed = pageSchema.parse(
    minimalPage({
      seo: {
        canonical: "https://example.com/en/test-page",
        description: "Safe SEO fields",
        ogImage: "media://asset-1",
        title: "Safe SEO",
      },
    }),
  );

  assert.equal(parsed.seo.canonical, "https://example.com/en/test-page");
  assert.equal(parsed.seo.ogImage, "media://asset-1");
  assert.equal(parsed.seo.noIndex, false);
});

test("page schema accepts noIndex SEO flag", () => {
  const parsed = pageSchema.parse(
    minimalPage({
      seo: {
        description: "Hidden from search results",
        noIndex: true,
        title: "Hidden page",
      },
    }),
  );

  assert.equal(parsed.seo.noIndex, true);
});

test("page schema keeps canonical URLs stricter than SEO images", () => {
  assert.throws(() =>
    pageSchema.parse(
      minimalPage({
        seo: {
          canonical: "media://asset-1",
          description: "",
          title: "Bad canonical",
        },
      }),
    ),
  );
});

test("media references can be collected and resolved", () => {
  const input = {
    hero: {
      image: "media://asset-1",
    },
    gallery: ["media://asset-2", "https://cdn.example.com/static.jpg"],
  };
  const references = collectMediaReferences(input);
  const resolved = resolveMediaReferences(input, (reference) =>
    reference.replace("media://", "https://cdn.example.com/"),
  );

  assert.deepEqual(references, ["media://asset-1", "media://asset-2"]);
  assert.equal(resolved.hero.image, "https://cdn.example.com/asset-1");
  assert.equal(resolved.gallery[0], "https://cdn.example.com/asset-2");
  assert.equal(resolved.gallery[1], "https://cdn.example.com/static.jpg");
});

test("media reference collection can stop at a safe limit", () => {
  const input = {
    gallery: Array.from(
      { length: pageMediaReferenceMaxCount + 2 },
      (_value, index) => `media://asset-${index}`,
    ),
  };

  assert.equal(pageMediaReferenceMaxCount, 200);
  assert.deepEqual(collectMediaReferences(input, { maxCount: 2 }), [
    "media://asset-0",
    "media://asset-1",
  ]);
  assert.deepEqual(collectMediaReferences(input, { maxCount: 0 }), []);
});

test("page schema rejects unsafe SEO URLs", () => {
  assert.throws(() =>
    pageSchema.parse(
      minimalPage({
        seo: {
          canonical: "javascript:alert(1)",
          description: "",
          ogImage: "data:text/html,bad",
          title: "Bad SEO",
        },
      }),
    ),
  );
});
