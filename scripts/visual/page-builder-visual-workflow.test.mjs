import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = ".github/workflows/page-builder-visual.yml";
const readmePath = "README.md";
const acceptanceDocPath = "docs/development/page-builder-visual-acceptance.md";
const releaseChecklistPath = "docs/development/release-checklist.md";
const referenceReadmePath = "docs/visual/page-builder-references/README.md";
const setupDocPath = "docs/development/setup.md";

test("page builder visual workflow captures fixture evidence", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /name: Page Builder Visual/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /permissions:/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /docs\/visual\/page-builder-references\/\*\*/);
  assert.match(workflow, /PAGE_BUILDER_VISUAL_BROWSER: google-chrome/);
  assert.match(workflow, /pnpm run check:file-size/);
  assert.match(workflow, /pnpm test:visual/);
  assert.match(
    workflow,
    /pnpm visual:artifact-bundle -- --artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.doesNotMatch(
    workflow,
    /cp docs\/development\/page-builder-visual-acceptance\.json/,
  );
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /Bundle:/);
  assert.match(workflow, /visual-capture-report\.json/);
  assert.match(workflow, /visual-reference-import-report\.md/);
  assert.match(workflow, /visual-acceptance-report\.json/);
  assert.match(workflow, /visual-acceptance-report\.md/);
  assert.match(workflow, /visual-artifact-check-report\.md/);
  assert.match(workflow, /page-builder-visual-acceptance\.json/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(
    workflow,
    /name: page-builder-visual-fixture-\$\{\{ github\.run_number \}\}/,
  );
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /Run id for Production Smoke/);
  assert.match(workflow, /--accept-passing --require-complete/);
  assert.match(workflow, /retention-days: 14/);
});

test("page builder visual workflow does not claim final design sign-off", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /Final sign-off still requires real design references/);
  assert.doesNotMatch(
    workflow,
    /^\s*-\s+run: pnpm visual:acceptance -- --require-accepted/m,
  );
  assert.doesNotMatch(
    workflow,
    /^\s*-\s+run: pnpm visual:measure -- --write --require-complete/m,
  );
});

test("visual workflow documentation is linked from release guidance", async () => {
  const [readme, acceptanceDoc, releaseChecklist, referenceReadme, setupDoc] =
    await Promise.all([
      readFile(readmePath, "utf8"),
      readFile(acceptanceDocPath, "utf8"),
      readFile(releaseChecklistPath, "utf8"),
      readFile(referenceReadmePath, "utf8"),
      readFile(setupDocPath, "utf8"),
    ]);

  assert.match(readme, /Page Builder Visual/);
  assert.match(readme, /page-builder-visual-fixture-<run_number>/);
  assert.match(readme, /visual-acceptance-report\.json/);
  assert.match(readme, /visual-reference-import-report\.md/);
  assert.match(readme, /visual-acceptance-report\.md/);
  assert.match(readme, /visual-artifact-check-report\.md/);
  assert.match(readme, /--accept-passing --require-complete/);
  assert.match(readme, /导入\/截图\/测量\/签收\/验收命令/);
  assert.doesNotMatch(readme, /导入\/截图\/测量\/验收命令/);
  assert.match(acceptanceDoc, /## CI Workflow/);
  assert.match(acceptanceDoc, /docs\/visual\/page-builder-references/);
  assert.match(acceptanceDoc, /reports\/visual\/page-builder-fixture/);
  assert.match(
    acceptanceDoc,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
  assert.match(acceptanceDoc, /--json/);
  assert.match(acceptanceDoc, /--markdown-output/);
  assert.match(acceptanceDoc, /--accept-passing --require-complete/);
  assert.match(
    acceptanceDoc,
    /import, capture, measure, accept-passing, and final verification commands/,
  );
  assert.doesNotMatch(
    acceptanceDoc,
    /import, capture, measure, and final verification commands/,
  );
  assert.match(releaseChecklist, /Page Builder Visual/);
  assert.match(releaseChecklist, /page-builder-visual-fixture-<run_number>/);
  assert.match(
    releaseChecklist,
    /--manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
  );
  assert.match(releaseChecklist, /visual-acceptance-report\.json/);
  assert.match(releaseChecklist, /visual-reference-import-report\.md/);
  assert.match(releaseChecklist, /visual-acceptance-report\.md/);
  assert.match(releaseChecklist, /visual-artifact-check-report\.md/);
  assert.match(releaseChecklist, /--accept-passing --require-complete/);
  assert.match(releaseChecklist, /import\/capture\/measure\/accept-passing\/verify/);
  assert.doesNotMatch(releaseChecklist, /import\/capture\/measure\/verify/);
  assert.match(referenceReadme, /--accept-passing --require-complete/);
  assert.match(setupDoc, /--accept-passing --require-complete/);
});
