import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage, pageSchema } from "@app-starter/schema";
import { updateSeoField } from "../src/features/pages/seo-updates.ts";

test("SEO optional URL edits remove blank canonical and Open Graph image values", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "https://store.brand-platform.com/en";
  schema.seo.ogImage = "https://cdn.brand-platform.com/og.jpg";

  const withoutCanonical = updateSeoField(schema, "canonical", " ");
  const withoutOgImage = updateSeoField(schema, "ogImage", "");

  assert.equal(withoutCanonical.seo.canonical, undefined);
  assert.equal(
    withoutCanonical.seo.ogImage,
    "https://cdn.brand-platform.com/og.jpg",
  );
  assert.equal(withoutOgImage.seo.ogImage, undefined);
  assert.equal(
    withoutOgImage.seo.canonical,
    "https://store.brand-platform.com/en",
  );
  assert.doesNotThrow(() => pageSchema.parse(withoutCanonical));
  assert.doesNotThrow(() => pageSchema.parse(withoutOgImage));
  assert.equal(schema.seo.canonical, "https://store.brand-platform.com/en");
  assert.equal(schema.seo.ogImage, "https://cdn.brand-platform.com/og.jpg");
});

test("SEO text edits keep blank title and description as explicit feedback values", () => {
  const schema = structuredClone(exampleLandingPage);

  assert.equal(updateSeoField(schema, "title", "").seo.title, "");
  assert.equal(updateSeoField(schema, "description", "").seo.description, "");
});
