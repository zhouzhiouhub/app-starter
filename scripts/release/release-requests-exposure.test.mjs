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
  assert.match(releaseChecklist, /release-requests-manifest\.json/);
  assert.match(releaseChecklist, /page-builder-reference-export-table\.tsv/);
  assert.match(releaseChecklist, /page-builder-reference-export-manifest\.json/);
  assert.match(releaseChecklist, /page-builder-reference-handoff/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(releaseChecklist, /production-smoke-dispatch-inputs\.json/);
  assert.match(releaseChecklist, /productionSmoke\.workflowFile/);
  assert.match(releaseChecklist, /productionSmoke\.ref/);
  assert.match(releaseChecklist, /productionSmoke\.dispatchManifestContext/);
  assert.match(releaseChecklist, /projectCompletion\.completionChecklist/);
  assert.match(releaseChecklist, /projectCompletion\.nextActionPreview/);
  assert.match(releaseChecklist, /validated before write/);
  assert.match(setupDoc, /pnpm release:requests/);
  assert.match(setupDoc, /release-requests-manifest\.json/);
  assert.match(setupDoc, /page-builder-reference-export-table\.tsv/);
  assert.match(setupDoc, /page-builder-reference-export-manifest\.json/);
  assert.match(setupDoc, /page-builder-reference-handoff/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(setupDoc, /production-smoke-dispatch-inputs\.json/);
  assert.match(setupDoc, /productionSmoke\.workflowFile/);
  assert.match(setupDoc, /productionSmoke\.ref/);
  assert.match(setupDoc, /productionSmoke\.dispatchManifestContext/);
  assert.match(setupDoc, /projectCompletion\.completionChecklist/);
  assert.match(setupDoc, /projectCompletion\.nextActionPreview/);
  assert.match(setupDoc, /validated before write/);
  assert.match(readme, /pnpm release:requests/);
  assert.match(readme, /release-requests-manifest\.json/);
  assert.match(readme, /page-builder-reference-export-table\.tsv/);
  assert.match(readme, /page-builder-reference-export-manifest\.json/);
  assert.match(readme, /page-builder-reference-handoff/);
  assert.match(readme, /production-smoke-dispatch-inputs\.tsv/);
  assert.match(readme, /production-smoke-dispatch-inputs\.json/);
  assert.match(readme, /productionSmoke\.workflowFile/);
  assert.match(readme, /productionSmoke\.ref/);
  assert.match(readme, /productionSmoke\.dispatchManifestContext/);
  assert.match(readme, /projectCompletion\.completionChecklist/);
  assert.match(readme, /projectCompletion\.nextActionPreview/);
  assert.match(readme, /写入前校验/);
});
