import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { readPublishPreflightIssueTarget } from "../src/features/pages/publish-preflight-target.ts";

test("publish preflight target maps section fields to section ids", () => {
  const target = readPublishPreflightIssueTarget(
    {
      field: "sections[1].props.content",
      message: "Rich text needs review.",
      severity: "warning",
    },
    exampleLandingPage,
  );

  assert.deepEqual(target, {
    field: "sections[1].props.content",
    kind: "section",
    label: "Section 2: rich text",
    sectionId: exampleLandingPage.sections[1].id,
  });
});

test("publish preflight target maps global fields to editor panels", () => {
  assert.deepEqual(
    readPublishPreflightIssueTarget(
      {
        field: "seo.ogImage",
        message: "Open Graph image needs review.",
        severity: "warning",
      },
      exampleLandingPage,
    ),
    { field: "seo.ogImage", kind: "seo", label: "SEO settings" },
  );

  assert.deepEqual(
    readPublishPreflightIssueTarget(
      {
        field: "chrome.header.content.navigation[0].href",
        message: "Navigation link is unsafe.",
        severity: "error",
      },
      exampleLandingPage,
    ),
    {
      field: "chrome.header.content.navigation[0].href",
      kind: "chrome",
      label: "Page settings",
    },
  );

  assert.deepEqual(
    readPublishPreflightIssueTarget(
      {
        field: "media.references",
        message: "Media references are unavailable.",
        severity: "error",
      },
      exampleLandingPage,
    ),
    { field: "media.references", kind: "media", label: "Preview media" },
  );

  assert.deepEqual(
    readPublishPreflightIssueTarget(
      {
        field: "meta.locale",
        message: "Locale is disabled.",
        severity: "error",
      },
      exampleLandingPage,
    ),
    { field: "meta.locale", kind: "page", label: "Page content" },
  );
});

test("publish preflight target ignores unknown and stale section fields", () => {
  assert.equal(
    readPublishPreflightIssueTarget(
      {
        field: "sections[99].props.title",
        message: "Missing section.",
        severity: "warning",
      },
      exampleLandingPage,
    ),
    null,
  );

  assert.equal(
    readPublishPreflightIssueTarget(
      {
        field: "unknown.field",
        message: "Unknown issue.",
        severity: "warning",
      },
      exampleLandingPage,
    ),
    null,
  );
});
