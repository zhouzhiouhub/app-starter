import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  collectPublishPreflightIssues,
  findBlockingPublishPreflightIssue,
} from "../src/features/pages/publish-preflight.ts";

test("publish preflight accepts the example landing page", () => {
  const issues = collectPublishPreflightIssues(exampleLandingPage);

  assert.deepEqual(issues, []);
  assert.equal(findBlockingPublishPreflightIssue(exampleLandingPage), null);
});

test("publish preflight blocks unsafe chrome links", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.chrome.header.content.navigation[0].href = "javascript:alert(1)";
  schema.chrome.header.content.localeSwitcher.locales[0].href = "";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "chrome.header.content.navigation[0].href");
  assert.equal(issues[0].severity, "error");
  assert.match(issues[0].message, /Header navigation link 1/);
  assert.equal(blocker?.field, "chrome.header.content.navigation[0].href");
});

test("publish preflight distinguishes SEO errors from warnings", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.seo.canonical = "javascript:alert(1)";
  schema.seo.ogImage = "media://asset-1";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [
      ["seo.canonical", "error"],
      ["seo.ogImage", "warning"],
    ],
  );
  assert.equal(blocker?.field, "seo.canonical");
});
