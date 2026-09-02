import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { runProductionSmokeDispatchCli } from "./production-smoke-dispatch-cli.mjs";
import {
  productionSmokeDispatchInputsManifestSchemaVersion,
} from "./production-smoke-dispatch-inputs-manifest-output.mjs";

test("production smoke dispatch CLI reads filled JSON input manifests", async () => {
  const root = `tmp/production-smoke-dispatch-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/dispatch-inputs.json`;
  const stdout = [];

  try {
    await mkdir(root, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        inputs: createFilledDispatchInputs(),
        schemaVersion: productionSmokeDispatchInputsManifestSchemaVersion,
      })}\n`,
      "utf8",
    );

    const exitCode = await runProductionSmokeDispatchCli(
      [
        "--inputs-json",
        manifestPath,
        "--release-tag",
        "v0.1.1",
        "--require-complete",
      ],
      { stdout: (line) => stdout.push(line) },
    );
    const output = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(output, /Ready to dispatch: yes/);
    assert.doesNotMatch(output, /Missing inputs:/);
    assert.match(output, /-f visual_artifact_name="page-builder-visual-fixture-281"/);
    assert.match(output, /-f release_tag="v0\.1\.1"/);
    assert.match(output, /-f storefront_url="https:\/\/store\.brand\.com\/"/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("production smoke dispatch CLI inherits workflow settings from JSON manifests", async () => {
  const root = `tmp/production-smoke-dispatch-workflow-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/dispatch-inputs.json`;
  const inheritedStdout = [];
  const overriddenStdout = [];

  try {
    await mkdir(root, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        inputs: createFilledDispatchInputs(),
        ref: "release/mvp",
        schemaVersion: productionSmokeDispatchInputsManifestSchemaVersion,
        workflowFile: "production-smoke-release.yml",
      })}\n`,
      "utf8",
    );

    const inheritedExitCode = await runProductionSmokeDispatchCli(
      ["--inputs-json", manifestPath, "--require-complete"],
      { stdout: (line) => inheritedStdout.push(line) },
    );
    const overriddenExitCode = await runProductionSmokeDispatchCli(
      [
        "--inputs-json",
        manifestPath,
        "--workflow-file",
        "production-smoke.yml",
        "--ref",
        "main",
        "--require-complete",
      ],
      { stdout: (line) => overriddenStdout.push(line) },
    );
    const inheritedOutput = inheritedStdout.join("\n");
    const overriddenOutput = overriddenStdout.join("\n");

    assert.equal(inheritedExitCode, 0);
    assert.match(inheritedOutput, /Workflow file: production-smoke-release\.yml/);
    assert.match(inheritedOutput, /Ref: release\/mvp/);
    assert.match(
      inheritedOutput,
      /Command: gh workflow run production-smoke-release\.yml --ref release\/mvp /,
    );
    assert.equal(overriddenExitCode, 0);
    assert.match(overriddenOutput, /Workflow file: production-smoke\.yml/);
    assert.match(overriddenOutput, /Ref: main/);
    assert.match(
      overriddenOutput,
      /Command: gh workflow run production-smoke\.yml --ref main /,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("production smoke dispatch CLI rejects invalid JSON input manifests", async () => {
  const root = `tmp/production-smoke-dispatch-invalid-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/dispatch-inputs.json`;
  const stderr = [];

  try {
    await mkdir(root, { recursive: true });
    await writeFile(manifestPath, "{", "utf8");
    const exitCode = await runProductionSmokeDispatchCli(
      ["--inputs-json", manifestPath],
      { stderr: (line) => stderr.push(line) },
    );

    assert.equal(exitCode, 1);
    assert.match(stderr.join("\n"), /must contain valid JSON/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("production smoke dispatch CLI rejects invalid JSON workflow settings", async () => {
  const root = `tmp/production-smoke-dispatch-invalid-workflow-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/dispatch-inputs.json`;
  const stderr = [];

  try {
    await mkdir(root, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify({
        inputs: createFilledDispatchInputs(),
        ref: "release/mvp",
        schemaVersion: productionSmokeDispatchInputsManifestSchemaVersion,
        workflowFile: 42,
      })}\n`,
      "utf8",
    );
    const exitCode = await runProductionSmokeDispatchCli(
      ["--inputs-json", manifestPath],
      { stderr: (line) => stderr.push(line) },
    );

    assert.equal(exitCode, 1);
    assert.match(stderr.join("\n"), /workflowFile must be a string/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

function createFilledDispatchInputs() {
  return [
    {
      name: "visual_artifact_name",
      value: "page-builder-visual-fixture-281",
    },
    { name: "visual_artifact_run_id", value: "33400968157" },
    {
      name: "local_verification_run_url",
      value:
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/33400968402",
    },
    {
      name: "local_verification_artifact_name",
      value: "local-verification-533",
    },
    { name: "release_tag", value: "v0.1.0" },
    { name: "rollback_target", value: "main@6769bd2" },
    { name: "storefront_url", value: "https://store.brand.com" },
  ];
}
