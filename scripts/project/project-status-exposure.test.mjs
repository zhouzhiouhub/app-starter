import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("project status command is exposed in package and CI", async () => {
  const [packageJson, ciWorkflow, readme, setupDoc] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile("README.md", "utf8"),
    readFile("docs/development/setup.md", "utf8"),
  ]);

  assert.match(
    packageJson,
    /"project:status": "node scripts\/project-status\.mjs"/,
  );
  assert.match(
    packageJson,
    /"test:project": "node --test scripts\/project\/\*\.test\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm project:status -- --help/);
  assert.match(ciWorkflow, /pnpm project:status -- --all-actions --json/);
  const localVerificationCommand =
    "pnpm project:status -- --all-actions --output tmp/project-status.json --markdown-output tmp/project-status-handoff.md";
  assert.match(
    ciWorkflow,
    new RegExp(escapeRegExp(localVerificationCommand)),
  );
  assert.equal(
    ciWorkflow.indexOf("pnpm build") <
      ciWorkflow.indexOf(localVerificationCommand),
    true,
  );
  assert.match(
    ciWorkflow,
    /name: local-verification-\$\{\{ github\.run_number \}\}/,
  );
  assert.match(ciWorkflow, /if-no-files-found: error/);
  assert.match(ciWorkflow, /tmp\/project-status\.json/);
  assert.match(ciWorkflow, /tmp\/project-status-handoff\.md/);
  assert.match(readme, /pnpm project:status -- --all-actions/);
  assert.match(readme, /local-verification-<run_number>/);
  assert.match(readme, /完成度摘要/);
  assert.match(
    readme,
    /pnpm project:status -- --markdown-output artifacts\/release\/project-status\.md/,
  );
  assert.match(
    readme,
    /pnpm project:status -- --output artifacts\/release\/project-status\.json/,
  );
  assert.match(readme, /Project Next Actions/);
  assert.match(setupDoc, /pnpm project:status -- --all-actions/);
  assert.match(setupDoc, /completion summary/);
  assert.match(
    setupDoc,
    /pnpm project:status -- --markdown-output artifacts\/release\/project-status\.md/,
  );
  assert.match(
    setupDoc,
    /pnpm project:status -- --output artifacts\/release\/project-status\.json/,
  );
  assert.match(
    setupDoc,
    /project:status` automatically includes the default\s+Page Builder Visual artifact/,
  );
  assert.match(
    setupDoc,
    /release:check` continues\s+to require an explicit `--visual-artifact-dir`/,
  );
  assert.match(setupDoc, /Project Next Actions/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
