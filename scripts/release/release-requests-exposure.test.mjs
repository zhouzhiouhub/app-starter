import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release requests command is exposed in package CI and docs", async () => {
  const [packageJsonText, workflow, releaseChecklist, setupDoc, readme] =
    await Promise.all([
      readFile("package.json", "utf8"),
      readFile(".github/workflows/ci.yml", "utf8"),
      readFile("docs/development/release-checklist.md", "utf8"),
      readFile("docs/development/setup.md", "utf8"),
      readFile("README.md", "utf8"),
    ]);
  const packageJson = JSON.parse(packageJsonText);

  assert.equal(
    packageJson.scripts["release:requests"],
    "node scripts/release-requests.mjs",
  );
  assert.match(workflow, /pnpm release:requests -- --help/);
  assert.match(releaseChecklist, /pnpm release:requests/);
  assert.match(releaseChecklist, /page-builder-reference-export-table\.tsv/);
  assert.match(releaseChecklist, /page-builder-reference-export-manifest\.json/);
  assert.match(releaseChecklist, /page-builder-reference-handoff/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.json/);
  assert.match(setupDoc, /pnpm release:requests/);
  assert.match(setupDoc, /page-builder-reference-export-table\.tsv/);
  assert.match(setupDoc, /page-builder-reference-export-manifest\.json/);
  assert.match(setupDoc, /page-builder-reference-handoff/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.json/);
  assert.match(readme, /pnpm release:requests/);
  assert.match(readme, /page-builder-reference-export-table\.tsv/);
  assert.match(readme, /page-builder-reference-export-manifest\.json/);
  assert.match(readme, /page-builder-reference-handoff/);
  assert.match(readme, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(readme, /production-smoke-dispatch-inputs\.json/);
});
