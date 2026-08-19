import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { collectPublishPreflightIssues } from "../src/features/pages/publish-preflight.ts";
import { addSection } from "../src/features/pages/section-management-updates.ts";

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
