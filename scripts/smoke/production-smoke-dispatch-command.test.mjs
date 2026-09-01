import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createProductionSmokeDispatchArtifact,
  readProductionSmokeDispatchCliConfig,
  runProductionSmokeDispatchCli,
} from "./production-smoke-dispatch-cli.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchValidationCommand,
  createProductionSmokeManualDispatchInstruction,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";

test("production smoke dispatch command names workflow and release inputs", () => {
  const command = createProductionSmokeDispatchCommand();

  assert.match(
    command,
    /^gh workflow run production-smoke\.yml --ref main /,
  );
  assert.match(
    command,
    /-f visual_artifact_name="page-builder-visual-fixture-<run_number>"/,
  );
  assert.match(
    command,
    /-f visual_artifact_run_id="<Page Builder Visual workflow run id>"/,
  );
  assert.match(command, /-f release_tag="<tag>"/);
  assert.match(
    command,
    /-f storefront_url="<public HTTPS storefront URL>"/,
  );
  assert.equal(productionSmokeDispatchInputs.length, 7);
  assert.ok(command.length <= 420);
});

test("production smoke dispatch validation command names safe CLI inputs", () => {
  const command = createProductionSmokeDispatchValidationCommand();

  assert.match(command, /^pnpm smoke:dispatch -- --require-complete /);
  assert.match(
    command,
    /--visual-artifact "page-builder-visual-fixture-<run_number>"/,
  );
  assert.match(
    command,
    /--local-verification-run-url "<main CI run URL>"/,
  );
  assert.match(command, /--release-tag "<tag>"/);
  assert.ok(command.length <= 420);
});

test("production smoke manual dispatch instruction names the workflow UI", () => {
  assert.equal(
    createProductionSmokeManualDispatchInstruction(),
    "GitHub Actions > Production Smoke > Run workflow, then use the listed workflow_dispatch inputs.",
  );
});

test("production smoke dispatch command accepts scoped overrides", () => {
  assert.equal(
    createProductionSmokeDispatchCommand({
      inputs: [{ name: "release_tag", value: 'release "candidate"' }],
      ref: "release/mvp",
      workflowFile: "production-smoke.yml",
    }),
    'gh workflow run production-smoke.yml --ref release/mvp -f release_tag="release \\"candidate\\""',
  );
});

test("production smoke dispatch CLI prints a safe placeholder command", async () => {
  const stdout = [];
  const exitCode = await runProductionSmokeDispatchCli([], {
    stdout: (line) => stdout.push(line),
  });
  const output = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(output, /Production Smoke dispatch/);
  assert.match(output, /Ready to dispatch: no/);
  assert.match(output, /Missing inputs: visual_artifact_name/);
  assert.match(
    output,
    /Command: gh workflow run production-smoke\.yml --ref main /,
  );
  assert.match(
    output,
    /-f local_verification_artifact_name="local-verification-<run_number>"/,
  );
});

test("production smoke dispatch CLI validates complete release inputs", async () => {
  const stdout = [];
  const args = [
    "--local-verification-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/33400968402",
    "--local-verification-artifact",
    "local-verification-533",
    "--visual-artifact",
    "page-builder-visual-fixture-281",
    "--visual-artifact-run-id",
    "33400968157",
    "--release-tag",
    "v0.1.0",
    "--rollback-target",
    "main@6769bd2",
    "--storefront-url",
    "https://store.brand.com",
    "--require-complete",
  ];
  const exitCode = await runProductionSmokeDispatchCli(args, {
    stdout: (line) => stdout.push(line),
  });
  const output = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(output, /Ready to dispatch: yes/);
  assert.doesNotMatch(output, /Missing inputs:/);
  assert.match(
    output,
    /-f visual_artifact_name="page-builder-visual-fixture-281"/,
  );
  assert.match(
    output,
    /-f local_verification_run_url="https:\/\/github\.com\/zhouzhiouhub\/app-starter\/actions\/runs\/33400968402"/,
  );
});

test("production smoke dispatch CLI can print JSON for integrations", async () => {
  const stdout = [];
  const exitCode = await runProductionSmokeDispatchCli(["--json"], {
    stdout: (line) => stdout.push(line),
  });
  const artifact = JSON.parse(stdout.join("\n"));

  assert.equal(exitCode, 0);
  assert.equal(artifact.workflowFile, "production-smoke.yml");
  assert.equal(artifact.ref, "main");
  assert.equal(artifact.readyToDispatch, false);
  assert.deepEqual(
    artifact.missingInputs.slice(0, 2),
    ["visual_artifact_name", "visual_artifact_run_id"],
  );
});

test("production smoke dispatch CLI blocks incomplete formal commands", async () => {
  const stderr = [];
  const exitCode = await runProductionSmokeDispatchCli(["--require-complete"], {
    stderr: (line) => stderr.push(line),
  });

  assert.equal(exitCode, 1);
  assert.match(
    stderr.join("\n"),
    /Missing dispatch inputs: visual_artifact_name/,
  );
});

test("production smoke dispatch CLI rejects unsafe evidence inputs", async () => {
  const stderr = [];
  const exitCode = await runProductionSmokeDispatchCli(
    ["--visual-artifact", "artifact.zip"],
    {
      stderr: (line) => stderr.push(line),
    },
  );

  assert.equal(exitCode, 1);
  assert.match(
    stderr.join("\n"),
    /page-builder-visual-fixture-<run_number>/,
  );
});

test("production smoke dispatch CLI exposes package and docs entry points", async () => {
  const [packageJsonText, releaseChecklist, setupDoc, readme] =
    await Promise.all([
      readFile("package.json", "utf8"),
      readFile("docs/development/release-checklist.md", "utf8"),
      readFile("docs/development/setup.md", "utf8"),
      readFile("README.md", "utf8"),
    ]);
  const packageJson = JSON.parse(packageJsonText);

  assert.equal(
    packageJson.scripts["smoke:dispatch"],
    "node scripts/production-smoke-dispatch.mjs",
  );
  assert.match(releaseChecklist, /pnpm smoke:dispatch/);
  assert.match(setupDoc, /pnpm smoke:dispatch/);
  assert.match(readme, /pnpm smoke:dispatch/);
});

test("production smoke dispatch config normalizes command options", () => {
  const artifact = createProductionSmokeDispatchArtifact(
    readProductionSmokeDispatchCliConfig([
      "--ref=release/mvp",
      "--workflow-file",
      "production-smoke.yml",
      "--visual-artifact-run-id=33400968157",
    ]),
  );

  assert.equal(artifact.ref, "release/mvp");
  assert.equal(artifact.workflowFile, "production-smoke.yml");
  assert.match(artifact.command, /--ref release\/mvp/);
  assert.match(artifact.command, /-f visual_artifact_run_id="33400968157"/);
});
