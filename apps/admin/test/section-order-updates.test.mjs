import assert from "node:assert/strict";
import test from "node:test";
import {
  exampleLandingPage,
  setSectionOrderForViewport,
} from "@app-starter/schema";
import {
  copyDesktopSectionOrderToMobile,
  moveSection,
  normalizeSectionOrder,
} from "../src/features/pages/section-order-updates.ts";

test("mobile section moves do not change desktop section order", () => {
  const schema = createDifferentlyOrderedSchema();

  const updated = moveSection(schema, "copy", "up", "mobile");

  assert.deepEqual(updated.layout.mobile.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(updated.layout.desktop.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(schema.layout.mobile.sectionOrder, ["hero", "copy"]);
});

test("desktop section moves do not change mobile section order", () => {
  const schema = createDifferentlyOrderedSchema();

  const updated = moveSection(schema, "copy", "down", "desktop");

  assert.deepEqual(updated.layout.desktop.sectionOrder, ["hero", "copy"]);
  assert.deepEqual(updated.layout.mobile.sectionOrder, ["hero", "copy"]);
  assert.deepEqual(schema.layout.desktop.sectionOrder, ["copy", "hero"]);
});

test("section moves outside the viewport bounds keep the schema unchanged", () => {
  const schema = createDifferentlyOrderedSchema();

  assert.equal(moveSection(schema, "copy", "up", "desktop"), schema);
  assert.equal(moveSection(schema, "missing", "down", "mobile"), schema);
});

test("desktop order copy replaces only the mobile section order", () => {
  const schema = createDifferentlyOrderedSchema();

  const updated = copyDesktopSectionOrderToMobile(schema);

  assert.deepEqual(updated.layout.desktop.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(updated.layout.mobile.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(schema.layout.mobile.sectionOrder, ["hero", "copy"]);
});

test("section order normalization removes stale and duplicate entries", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.layout.desktop.sectionOrder = ["copy", "missing", "copy"];
  schema.layout.mobile.sectionOrder = ["hero", "copy"];

  const updated = normalizeSectionOrder(schema, "desktop");

  assert.deepEqual(updated.layout.desktop.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(updated.layout.mobile.sectionOrder, ["hero", "copy"]);
  assert.deepEqual(schema.layout.desktop.sectionOrder, [
    "copy",
    "missing",
    "copy",
  ]);
});

function createDifferentlyOrderedSchema() {
  let schema = structuredClone(exampleLandingPage);
  schema = setSectionOrderForViewport(schema, "desktop", ["copy", "hero"]);
  schema = setSectionOrderForViewport(schema, "mobile", ["hero", "copy"]);

  return schema;
}
