import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  collectPublishPreflightIssues,
  findBlockingPublishPreflightIssue,
} from "../src/features/pages/publish-preflight.ts";

test("publish preflight blocks empty pages", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections = [];
  schema.layout.desktop.sectionOrder = [];
  schema.layout.mobile.sectionOrder = [];

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections", "error"]],
  );
  assert.match(issues[0].message, /at least one section/);
  assert.equal(blocker?.field, "sections");
});

test("publish preflight blocks duplicate section ids", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections.push({
    ...structuredClone(schema.sections[0]),
  });

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[2].id", "error"]],
  );
  assert.match(issues[0].message, /duplicated/);
  assert.equal(blocker?.field, "sections[2].id");
});

test("publish preflight blocks hidden viewport content", () => {
  const schema = structuredClone(exampleLandingPage);

  for (const section of schema.sections) {
    section.visibility.desktop = false;
  }

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[0].visibility.desktop", "error"]],
  );
  assert.match(issues[0].message, /Desktop has no visible sections/);
  assert.equal(blocker?.field, "sections[0].visibility.desktop");
});

test("publish preflight warns about mobile layout overflow", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].layout.mobile = { width: 420, x: 0, y: 0 };

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[0].layout.mobile.width", "warning"]],
  );
  assert.match(issues[0].message, /avoid clipped storefront content/);
  assert.equal(blocker, null);
});

test("publish preflight warns about missing visible viewport layouts", () => {
  const schema = structuredClone(exampleLandingPage);
  delete schema.sections[0].layout.desktop;

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[0].layout.desktop", "warning"]],
  );
  assert.match(
    issues[0].message,
    /preview and storefront rendering stay consistent/,
  );
  assert.equal(blocker, null);
});
