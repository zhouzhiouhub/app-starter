import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createProjectStatusArtifact } from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

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
  assert.match(packageJson, /"verify:local": "pnpm run check:install/);
  assert.match(packageJson, /pnpm project:status -- --all-actions --output tmp\/project-status\.json --markdown-output tmp\/project-status-handoff\.md/);
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
  assert.match(readme, /pnpm run verify:local/);
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
  assert.match(setupDoc, /pnpm run verify:local/);
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

test("project status local verification matches package and CI commands", async () => {
  const [packageJsonText, ciWorkflow] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
  ]);
  const packageJson = JSON.parse(packageJsonText);
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });
  const artifactCommands = artifact.localVerification.commands.map(
    (item) => item.command,
  );
  const packageVerificationCommands = readPackageScriptCommands(
    packageJson.scripts["verify:local"],
  );

  assert.equal(artifact.localVerification.shortcut, "pnpm run verify:local");
  assert.deepEqual(artifact.localVerification.handoff, {
    jsonPath: "tmp/project-status.json",
    markdownPath: "tmp/project-status-handoff.md",
  });
  assert.deepEqual(packageVerificationCommands, [
    "pnpm run check:install",
    ...artifactCommands.slice(1),
  ]);
  assertOrderedSubset(readWorkflowRunCommands(ciWorkflow), artifactCommands);
  assert.match(
    ciWorkflow,
    new RegExp(escapeRegExp(artifact.localVerification.handoff.jsonPath)),
  );
  assert.match(
    ciWorkflow,
    new RegExp(escapeRegExp(artifact.localVerification.handoff.markdownPath)),
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function readPackageScriptCommands(script) {
  assert.equal(typeof script, "string");

  return script.split(" && ").map((command) => command.trim());
}

function readWorkflowRunCommands(workflow) {
  return workflow
    .split(/\r?\n/u)
    .map((line) => line.match(/^\s*-\s+run:\s+(.+)$/u)?.[1]?.trim())
    .filter(Boolean);
}

function assertOrderedSubset(commands, expectedCommands) {
  let startIndex = 0;

  for (const expectedCommand of expectedCommands) {
    const foundIndex = commands.indexOf(expectedCommand, startIndex);

    assert.notEqual(
      foundIndex,
      -1,
      `${expectedCommand} must appear in the CI verification flow.`,
    );
    startIndex = foundIndex + 1;
  }
}
