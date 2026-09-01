import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release evidence request command is exposed in package CI and docs", async () => {
  const [packageJsonText, workflow, requestCli, releaseChecklist, setupDoc, readme] =
    await Promise.all([
      readFile("package.json", "utf8"),
      readFile(".github/workflows/ci.yml", "utf8"),
      readFile("scripts/release-evidence-request.mjs", "utf8"),
      readFile("docs/development/release-checklist.md", "utf8"),
      readFile("docs/development/setup.md", "utf8"),
      readFile("README.md", "utf8"),
    ]);
  const packageJson = JSON.parse(packageJsonText);

  assert.equal(
    packageJson.scripts["release:evidence-request"],
    "node scripts/release-evidence-request.mjs --output artifacts/release/release-evidence-request.md",
  );
  assert.match(workflow, /pnpm release:evidence-request -- --help/);
  assert.match(requestCli, /runReleaseEvidenceRequestCli/);
  assert.match(releaseChecklist, /pnpm release:evidence-request/);
  assert.match(releaseChecklist, /--visual-output/);
  assert.match(releaseChecklist, /--visual-missing-output/);
  assert.match(releaseChecklist, /--visual-table-output/);
  assert.match(releaseChecklist, /--smoke-output/);
  assert.match(releaseChecklist, /--smoke-inputs-output/);
  assert.match(releaseChecklist, /--smoke-inputs-table-output/);
  assert.match(releaseChecklist, /dispatch input\s+template path/);
  assert.match(releaseChecklist, /First missing visual reference/);
  assert.match(setupDoc, /pnpm release:evidence-request/);
  assert.match(setupDoc, /--visual-output <path>/);
  assert.match(setupDoc, /--visual-missing-output <path>/);
  assert.match(setupDoc, /--visual-table-output <path>/);
  assert.match(setupDoc, /--smoke-output <path>/);
  assert.match(setupDoc, /--smoke-inputs-output <path>/);
  assert.match(setupDoc, /--smoke-inputs-table-output <path>/);
  assert.match(setupDoc, /dispatch input template\s+path/);
  assert.match(setupDoc, /Missing Production Smoke inputs/);
  assert.match(readme, /pnpm release:evidence-request/);
  assert.match(readme, /--visual-output <path>/);
  assert.match(readme, /--visual-missing-output <path>/);
  assert.match(readme, /--visual-table-output <path>/);
  assert.match(readme, /--smoke-output <path>/);
  assert.match(readme, /--smoke-inputs-output <path>/);
  assert.match(readme, /--smoke-inputs-table-output <path>/);
  assert.match(readme, /dispatch 输入模板路径/);
  assert.match(readme, /First missing visual reference/);
});
