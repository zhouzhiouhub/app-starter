import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { buildPageMetadata } from "../src/lib/page-metadata.ts";

test("page metadata includes resolved Open Graph images", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.ogImage = "https://cdn.example.com/og.jpg";

  const metadata = buildPageMetadata(schema);

  assert.deepEqual(metadata.openGraph?.images, [
    "https://cdn.example.com/og.jpg",
  ]);
});

test("page metadata omits unresolved media references from Open Graph images", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.ogImage = "media://asset-missing";

  const metadata = buildPageMetadata(schema);

  assert.equal(metadata.openGraph?.images, undefined);
});
