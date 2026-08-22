import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  applyPublishPreflightIssueFix,
  readPublishPreflightIssueFixLabel,
} from "../src/features/pages/publish-preflight-issue-fix.ts";

test("publish preflight issue fix labels section order warnings", () => {
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "layout.desktop.sectionOrder",
      message: "Desktop section order will be normalized.",
      severity: "warning",
    }),
    "Normalize desktop order",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "seo.ogImage",
      message: "Open Graph image needs review.",
      severity: "warning",
    }),
    null,
  );
});

test("publish preflight issue fix normalizes only the matching viewport order", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.layout.desktop.sectionOrder = ["copy", "missing", "copy"];
  schema.layout.mobile.sectionOrder = ["hero", "copy"];

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "layout.desktop.sectionOrder",
    message: "Desktop section order will be normalized.",
    severity: "warning",
  });

  assert.deepEqual(fixed?.layout.desktop.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(fixed?.layout.mobile.sectionOrder, ["hero", "copy"]);
  assert.deepEqual(schema.layout.desktop.sectionOrder, [
    "copy",
    "missing",
    "copy",
  ]);
});

test("publish preflight issue fix ignores unsupported issues", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "sections[0].props.ctaHref",
    message: "CTA link needs review.",
    severity: "warning",
  });

  assert.equal(fixed, null);
});
