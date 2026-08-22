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
