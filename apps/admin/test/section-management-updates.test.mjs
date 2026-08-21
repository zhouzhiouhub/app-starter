import assert from "node:assert/strict";
import test from "node:test";
import {
  exampleLandingPage,
  getOrderedSectionsForViewport,
  setSectionOrderForViewport,
} from "@app-starter/schema";
import { collectPublishPreflightIssues } from "../src/features/pages/publish-preflight.ts";
import {
  addSection,
  duplicateSection,
  removeSection,
} from "../src/features/pages/section-management-updates.ts";

test("new CTA sections include safe default links", () => {
  for (const templateId of ["hero-banner", "cta-bar"]) {
    const { schema, sectionId } = addSection(
      structuredClone(exampleLandingPage),
      templateId,
    );
    const section = schema.sections.find((item) => item.id === sectionId);

    assert.equal(typeof section?.props.ctaHref, "string");
    assert.match(section?.props.ctaHref, /^\/en(?:\/contact)?$/);
    assert.deepEqual(collectPublishPreflightIssues(schema), []);
  }
});

test("new sections are appended to explicit desktop and mobile orders", () => {
  const current = createDifferentlyOrderedSchema();

  const { schema, sectionId } = addSection(current, "cta-bar");

  assert.deepEqual(schema.layout.desktop.sectionOrder, [
    "copy",
    "hero",
    sectionId,
  ]);
  assert.deepEqual(schema.layout.mobile.sectionOrder, [
    "hero",
    "copy",
    sectionId,
  ]);
  assert.deepEqual(
    getOrderedSectionsForViewport(schema, "mobile").map((section) => section.id),
    ["hero", "copy", sectionId],
  );
});

test("duplicated sections keep each viewport order near the source section", () => {
  const current = createDifferentlyOrderedSchema();

  const { schema, sectionId } = duplicateSection(current, "hero");

  assert.deepEqual(schema.layout.desktop.sectionOrder, [
    "copy",
    "hero",
    sectionId,
  ]);
  assert.deepEqual(schema.layout.mobile.sectionOrder, [
    "hero",
    sectionId,
    "copy",
  ]);
});

test("removed sections are cleared from desktop and mobile orders", () => {
  const current = createDifferentlyOrderedSchema();

  const schema = removeSection(current, "hero");

  assert.deepEqual(schema.layout.desktop.sectionOrder, ["copy"]);
  assert.deepEqual(schema.layout.mobile.sectionOrder, ["copy"]);
  assert.deepEqual(schema.sections.map((section) => section.id), ["copy"]);
});

function createDifferentlyOrderedSchema() {
  let schema = structuredClone(exampleLandingPage);
  schema = setSectionOrderForViewport(schema, "desktop", ["copy", "hero"]);
  schema = setSectionOrderForViewport(schema, "mobile", ["hero", "copy"]);

  return schema;
}
