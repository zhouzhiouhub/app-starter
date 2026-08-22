import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { buildPageMetadata } from "../src/lib/page-metadata.ts";

test("page metadata uses normalized canonical URLs", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "  /campaign  ";

  const metadata = buildPageMetadata(schema);

  assert.equal(metadata.alternates?.canonical, "/campaign");
});

test("page metadata resolves relative canonical URLs with the site origin", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "  /campaign  ";

  const metadata = buildPageMetadata(schema, {
    origin: "https://store.brand-platform.com",
  });

  assert.equal(
    metadata.alternates?.canonical,
    "https://store.brand-platform.com/campaign",
  );
});

test("page metadata falls back to the storefront canonical path", () => {
  const schema = structuredClone(exampleLandingPage);
  delete schema.seo.canonical;

  const metadata = buildPageMetadata(schema, {
    origin: "https://store.brand-platform.com",
  });

  assert.equal(
    metadata.alternates?.canonical,
    "https://store.brand-platform.com/en",
  );
});

test("page metadata uses the storefront canonical path for non-home pages", () => {
  const schema = structuredClone(exampleLandingPage);
  delete schema.seo.canonical;
  schema.meta.slug = "launch/summer";

  const metadata = buildPageMetadata(schema, {
    origin: "https://store.brand-platform.com",
  });

  assert.equal(
    metadata.alternates?.canonical,
    "https://store.brand-platform.com/en/launch/summer",
  );
});

test("page metadata replaces unsafe canonical URLs with the storefront path", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "javascript:alert(1)";

  const metadata = buildPageMetadata(schema, {
    origin: "https://store.brand-platform.com",
  });

  assert.equal(
    metadata.alternates?.canonical,
    "https://store.brand-platform.com/en",
  );
});

test("page metadata includes resolved Open Graph images", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.ogImage = "https://cdn.example.com/og.jpg";

  const metadata = buildPageMetadata(schema);

  assert.deepEqual(metadata.openGraph?.images, [
    "https://cdn.example.com/og.jpg",
  ]);
});

test("page metadata resolves relative Open Graph images with the site origin", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.ogImage = "/og.jpg";

  const metadata = buildPageMetadata(schema, {
    origin: "https://store.brand-platform.com",
  });

  assert.deepEqual(metadata.openGraph?.images, [
    "https://store.brand-platform.com/og.jpg",
  ]);
});

test("page metadata omits unresolved media references from Open Graph images", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.ogImage = "media://asset-missing";

  const metadata = buildPageMetadata(schema);

  assert.equal(metadata.openGraph?.images, undefined);
});

test("page metadata omits unsafe Open Graph image URLs", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.ogImage = "http://cdn.example.com/og.jpg";

  const metadata = buildPageMetadata(schema);

  assert.equal(metadata.openGraph?.images, undefined);
});
