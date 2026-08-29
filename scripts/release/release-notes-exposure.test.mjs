import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release notes command is exposed in package, CI, and release docs", async () => {
  const [packageJson, ciWorkflow, releaseChecklist] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(
    packageJson,
    /"release:notes": "node scripts\/release-notes\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:notes -- --help/);
  assert.match(releaseChecklist, /pnpm release:notes/);
  assert.match(releaseChecklist, /completion\s+summary/);
  assert.match(
    releaseChecklist,
    /--project-status artifacts\/release\/project-status\.json/,
  );
  assert.match(
    releaseChecklist,
    /--project-status-artifact project-status-<run_number>/,
  );
  assert.match(
    releaseChecklist,
    /--preflight-artifact release-preflight-<run_number>/,
  );
});
