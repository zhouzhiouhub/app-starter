import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { collectPageStructurePreflightIssues } from "../src/features/pages/page-structure-publish-preflight.ts";

test("page structure preflight accepts normal section structure", () => {
  assert.deepEqual(collectPageStructurePreflightIssues(exampleLandingPage), []);
});

test("page structure preflight blocks empty pages", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections = [];

  assert.deepEqual(collectPageStructurePreflightIssues(schema), [
    {
      field: "sections",
      message: "Page must include at least one section before publishing.",
      severity: "error",
    },
  ]);
});

test("page structure preflight blocks viewports without visible sections", () => {
  const schema = structuredClone(exampleLandingPage);

  for (const section of schema.sections) {
    section.visibility.mobile = false;
  }

  assert.deepEqual(collectPageStructurePreflightIssues(schema), [
    {
      field: "sections[0].visibility.mobile",
      message:
        "Mobile has no visible sections. Make at least one section visible for Mobile before publishing.",
      severity: "error",
    },
  ]);

  schema.sections[1].visibility.mobile = true;
  assert.deepEqual(collectPageStructurePreflightIssues(schema), []);
});

test("page structure preflight warns about mobile layout overflow", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].layout.mobile = { width: 360, x: 48, y: 0 };
  schema.sections[1].layout.mobile = { width: 640, x: 0, y: 560 };
  schema.sections[1].visibility.mobile = false;

  const issues = collectPageStructurePreflightIssues(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[0].layout.mobile.width", "warning"]],
  );
  assert.match(issues[0].message, /Mobile section 1 extends beyond the 390px canvas/);

  schema.sections[0].layout.mobile = { width: 342, x: 48, y: 0 };
  assert.deepEqual(collectPageStructurePreflightIssues(schema), []);
});

test("page structure preflight warns when visible viewport layouts are missing", () => {
  const schema = structuredClone(exampleLandingPage);
  delete schema.sections[0].layout.mobile;
  delete schema.sections[1].layout.desktop;
  schema.sections[1].visibility.desktop = false;

  assert.deepEqual(collectPageStructurePreflightIssues(schema), [
    {
      field: "sections[0].layout.mobile",
      message:
        "Mobile layout is missing for section 1. Save a Mobile layout edit before publishing so preview and storefront rendering stay consistent.",
      severity: "warning",
    },
  ]);

  schema.sections[0].layout.mobile = { width: 390, x: 0, y: 0 };
  assert.deepEqual(collectPageStructurePreflightIssues(schema), []);
});

test("page structure preflight blocks duplicate section ids", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections.push({
    ...structuredClone(schema.sections[0]),
  });
  schema.sections.push({
    ...structuredClone(schema.sections[1]),
  });

  assert.deepEqual(
    collectPageStructurePreflightIssues(schema).map((issue) => [
      issue.field,
      issue.severity,
    ]),
    [
      ["sections[2].id", "error"],
      ["sections[3].id", "error"],
    ],
  );
});

test("page structure preflight blocks visible unsupported components", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].component = "legacy-carousel";
  schema.sections[1].component = "experimental-quote";
  schema.sections[1].visibility.desktop = false;
  schema.sections[1].visibility.mobile = false;

  assert.deepEqual(collectPageStructurePreflightIssues(schema), [
    {
      field: "sections[0].component",
      message:
        'Section 1 uses unsupported component "legacy-carousel". Choose a supported section before publishing so the storefront renderer can render the page.',
      severity: "error",
    },
  ]);
});

test("page structure preflight warns about stale section orders", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.layout.desktop.sectionOrder = ["hero", "missing", "hero"];
  schema.layout.mobile.sectionOrder = ["copy"];

  const issues = collectPageStructurePreflightIssues(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [
      ["layout.desktop.sectionOrder", "warning"],
      ["layout.mobile.sectionOrder", "warning"],
    ],
  );
  assert.match(
    issues[0].message,
    /Desktop section order.*1 stale reference.*1 duplicate entry.*1 omitted section/,
  );
  assert.match(
    issues[1].message,
    /Mobile section order.*1 omitted section/,
  );
});

test("page structure preflight accepts already normalized explicit section orders", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.layout.desktop.sectionOrder = ["copy", "hero"];
  schema.layout.mobile.sectionOrder = ["hero", "copy"];

  assert.deepEqual(collectPageStructurePreflightIssues(schema), []);
});
