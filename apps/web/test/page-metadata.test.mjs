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

test("page metadata ignores non-local HTTP origins", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "  /campaign  ";
  schema.seo.ogImage = "/og.jpg";

  const metadata = buildPageMetadata(schema, {
    origin: "http://store.brand-platform.com",
  });

  assert.equal(metadata.alternates?.canonical, "/campaign");
  assert.deepEqual(metadata.openGraph?.images, ["/og.jpg"]);
});

test("page metadata ignores origins with credentials or paths", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "  /campaign  ";
  schema.seo.ogImage = "/og.jpg";

  for (const origin of [
    "https://user:pass@store.brand-platform.com",
    "https://store.brand-platform.com/path",
    "https://store.brand-platform.com?token=secret",
    "https://store.brand-platform.com#fragment",
  ]) {
    const metadata = buildPageMetadata(schema, { origin });

    assert.equal(metadata.alternates?.canonical, "/campaign");
    assert.deepEqual(metadata.openGraph?.images, ["/og.jpg"]);
  }
});

test("page metadata keeps localhost HTTP origins for local development", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "  /campaign  ";
  schema.seo.ogImage = "/og.jpg";

  const metadata = buildPageMetadata(schema, {
    origin: "http://localhost:3000",
  });

  assert.equal(metadata.alternates?.canonical, "http://localhost:3000/campaign");
  assert.deepEqual(metadata.openGraph?.images, [
    "http://localhost:3000/og.jpg",
  ]);
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

test("page metadata replaces unsafe absolute canonical origins", () => {
  const schema = structuredClone(exampleLandingPage);

  for (const canonical of [
    "https://example.com/campaign",
    "https://localhost/campaign",
    "http://store.brand-platform.com/campaign",
    "https://192.0.2.10/campaign",
  ]) {
    schema.seo.canonical = canonical;

    const metadata = buildPageMetadata(schema, {
      origin: "https://store.brand-platform.com",
    });

    assert.equal(
      metadata.alternates?.canonical,
      "https://store.brand-platform.com/en",
    );
  }
});

test("page metadata keeps safe absolute canonical URLs", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "https://canonical.brand-platform.com/campaign";

  const metadata = buildPageMetadata(schema, {
    origin: "https://store.brand-platform.com",
  });

  assert.equal(
    metadata.alternates?.canonical,
    "https://canonical.brand-platform.com/campaign",
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
