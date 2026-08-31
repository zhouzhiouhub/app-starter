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
  assert.match(readme, /pnpm project:status -- --summary/);
  assert.match(readme, /pnpm run verify:local/);
  assert.match(readme, /local-verification-<run_number>/);
  assert.match(readme, /completionChecklist/);
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
  assert.match(setupDoc, /pnpm project:status -- --summary/);
  assert.match(setupDoc, /pnpm run verify:local/);
  assert.match(setupDoc, /completion summary/);
  assert.match(setupDoc, /completion checklist/);
  assert.match(setupDoc, /completionChecklist/);
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

test("main CI writes pnpm test diagnostics on failure", async () => {
  const workflow = await readFile(".github/workflows/ci.yml", "utf8");

  assert.match(workflow, /name: Write CI test diagnostics/);
  assert.match(workflow, /continue-on-error: true/);
  assert.match(workflow, /## CI Test Diagnostics/);
  assert.match(workflow, /reports\/ci-diagnostics/);
  assert.match(workflow, /pnpm test > reports\/ci-diagnostics\/pnpm-test-rerun\.log 2>&1/);
  assert.match(workflow, /::error title=CI test diagnostics::rerun exit/);
  assert.match(workflow, /tail -n 120/);
  assert.match(workflow, /exit 0/);
  assert.match(workflow, /name: Upload CI test diagnostics artifact/);
  assert.match(workflow, /ci-test-diagnostics-\$\{\{ github\.run_number \}\}/);
  assert.match(workflow, /if-no-files-found: error/);
});

test("placeholder packages without test files skip bare node test", async () => {
  const packagePaths = [
    "packages/admin-theme/package.json",
    "packages/custom-admin/package.json",
    "packages/custom-components/package.json",
    "packages/design-tokens/package.json",
    "packages/extension-sdk/package.json",
    "packages/integration-adapters/package.json",
  ];

  const packages = await Promise.all(
    packagePaths.map(async (packagePath) => ({
      packagePath,
      packageJson: JSON.parse(await readFile(packagePath, "utf8")),
    })),
  );

  for (const { packagePath, packageJson } of packages) {
    assert.equal(
      packageJson.scripts?.test,
      undefined,
      `${packagePath} should only add a test script when it has test files.`,
    );
  }
});

test("workspace packages with dist tests use explicit test file globs", async () => {
  const packagePaths = [
    "packages/renderer/package.json",
    "packages/schema/package.json",
    "packages/ui/package.json",
    "services/api/package.json",
  ];

  const packages = await Promise.all(
    packagePaths.map(async (packagePath) => ({
      packagePath,
      packageJson: JSON.parse(await readFile(packagePath, "utf8")),
    })),
  );

  for (const { packagePath, packageJson } of packages) {
    assert.equal(
      packageJson.scripts?.test,
      "node --test test/*.test.mjs",
      `${packagePath} should avoid platform-specific node --test discovery.`,
    );
  }
});

test("workspace packages with source imports use the TypeScript test loader", async () => {
  const packagePaths = [
    "apps/admin/package.json",
    "apps/web/package.json",
    "packages/analytics/package.json",
  ];

  const packages = await Promise.all(
    packagePaths.map(async (packagePath) => ({
      packagePath,
      packageJson: JSON.parse(await readFile(packagePath, "utf8")),
    })),
  );

  for (const { packagePath, packageJson } of packages) {
    assert.equal(
      packageJson.scripts?.test,
      "node --import ../../scripts/register-typescript-test-loader.mjs --test test/*.test.mjs",
      `${packagePath} should run TypeScript source imports on Node 20.`,
    );
  }
});

test("app source tests build workspace dependencies before running", async () => {
  const [adminPackageJson, webPackageJson] = await Promise.all([
    readPackageJson("apps/admin/package.json"),
    readPackageJson("apps/web/package.json"),
  ]);

  assertPretestBuilds(
    adminPackageJson,
    [
      "@app-starter/schema",
      "@app-starter/design-tokens",
      "@app-starter/admin-theme",
      "@app-starter/custom-admin",
      "@app-starter/ui",
      "@app-starter/renderer",
    ],
    "apps/admin/package.json",
  );
  assertPretestBuilds(
    webPackageJson,
    [
      "@app-starter/schema",
      "@app-starter/design-tokens",
      "@app-starter/ui",
      "@app-starter/renderer",
    ],
    "apps/web/package.json",
  );
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function readPackageJson(packagePath) {
  return JSON.parse(await readFile(packagePath, "utf8"));
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

function assertPretestBuilds(packageJson, expectedFilters, packagePath) {
  const pretest = packageJson.scripts?.pretest;

  assert.equal(
    typeof pretest,
    "string",
    `${packagePath} should build workspace dependencies before tests.`,
  );
  assert.match(pretest, /\bbuild$/u);

  for (const filterName of expectedFilters) {
    assert.match(
      pretest,
      new RegExp(`--filter ${escapeRegExp(filterName)}\\b`, "u"),
      `${packagePath} pretest should build ${filterName}.`,
    );
  }
}
