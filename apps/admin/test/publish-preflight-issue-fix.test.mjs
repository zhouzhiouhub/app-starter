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
      field: "sections[1].props.content",
      message: "Rich text markup will be sanitized.",
      severity: "warning",
    }),
    "Sanitize rich text",
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

test("publish preflight issue fix sanitizes rich text content", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[1].props.content = {
    defaultValue:
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script><a href="javascript:alert(3)">Bad</a>',
    i18nKey: "sections.copy.content",
  };

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "sections[1].props.content",
    message: "Rich text section 2: unsupported markup will be removed.",
    severity: "warning",
  });

  assert.deepEqual(fixed?.sections[1].props.content, {
    defaultValue: "<p>Safe</p>Bad",
    i18nKey: "sections.copy.content",
  });
  assert.deepEqual(schema.sections[1].props.content, {
    defaultValue:
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script><a href="javascript:alert(3)">Bad</a>',
    i18nKey: "sections.copy.content",
  });
});

test("publish preflight issue fix ignores non-rich-text content fields", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "sections[0].props.content",
    message: "Content needs review.",
    severity: "warning",
  });

  assert.equal(fixed, null);
});

test("publish preflight issue fix ignores unsupported issues", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "sections[0].props.ctaHref",
    message: "CTA link needs review.",
    severity: "warning",
  });

  assert.equal(fixed, null);
});
