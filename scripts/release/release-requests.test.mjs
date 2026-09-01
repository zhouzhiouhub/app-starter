import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
  readReleaseRequestsCliConfig,
  runReleaseRequestsCli,
} from "./release-requests.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release requests CLI writes every local request Markdown", async () => {
  const root = `tmp/release-requests-cli-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const releaseOutput = `${root}/release-evidence-request.md`;
  const visualOutput = `${root}/page-builder-reference-request.md`;
  const visualMissingOutput = `${root}/page-builder-missing-references.txt`;
  const smokeOutput = `${root}/production-smoke-request.md`;
  const smokeInputsOutput = `${root}/production-smoke-dispatch-inputs.txt`;
  const stdout = [];
  const visualManifest = createPendingVisualManifest();

  try {
    await mkdir(root, { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(visualManifest, null, 2)}\n`);

    const exitCode = await runReleaseRequestsCli(
      [
        "--manifest",
        manifestPath,
        "--release-output",
        releaseOutput,
        "--visual-output",
        visualOutput,
        "--visual-missing-output",
        visualMissingOutput,
        "--smoke-output",
        smokeOutput,
        "--smoke-inputs-output",
        smokeInputsOutput,
      ],
      {
        generatedAt: "2026-09-01T00:00:00.000Z",
        smokeArtifact: { error: new Error("No smoke reports found.") },
        stdout: (line) => stdout.push(line),
        visualManifest,
        visualReferenceManifest: visualManifest,
      },
    );

    const [
      releaseMarkdown,
      visualMarkdown,
      visualMissingPaths,
      smokeMarkdown,
      smokeInputsText,
    ] = await Promise.all([
      readFile(releaseOutput, "utf8"),
      readFile(visualOutput, "utf8"),
      readFile(visualMissingOutput, "utf8"),
      readFile(smokeOutput, "utf8"),
      readFile(smokeInputsOutput, "utf8"),
    ]);
    const output = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(output, /Release evidence request bundle/);
    assert.match(output, /Release request files refreshed:/);
    assert.match(output, new RegExp(`Release evidence: ${escapeRegExp(releaseOutput)}`));
    assert.match(output, new RegExp(`Page Builder design: ${escapeRegExp(visualOutput)}`));
    assert.match(
      output,
      new RegExp(`Page Builder missing paths: ${escapeRegExp(visualMissingOutput)}`),
    );
    assert.match(output, new RegExp(`Production Smoke: ${escapeRegExp(smokeOutput)}`));
    assert.match(
      output,
      new RegExp(`Production Smoke inputs: ${escapeRegExp(smokeInputsOutput)}`),
    );
    assert.match(releaseMarkdown, /^# MVP Release Evidence Request/m);
    assert.match(visualMarkdown, /^# Page Builder Design Reference Request/m);
    assert.match(
      visualMissingPaths,
      /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.match(smokeMarkdown, /^# Production Smoke Evidence Request/m);
    assert.match(
      smokeInputsText,
      /^visual_artifact_name=page-builder-visual-fixture-<run_number>/m,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release requests config routes shared evidence inputs", () => {
  const config = readReleaseRequestsCliConfig([
    "--",
    "--release-output",
    "tmp/release.md",
    "--visual-output=tmp/visual.md",
    "--visual-missing-output",
    "tmp/missing.txt",
    "--smoke-output",
    "tmp/smoke.md",
    "--smoke-inputs-output",
    "tmp/smoke-inputs.txt",
    "--source-dir",
    "docs/visual/page-builder-references",
    "--visual-manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    "--smoke-report",
    "artifacts/production-smoke/smoke-report.json",
    "--visual-artifact-dir",
    "reports/visual/page-builder-fixture",
    "--visual-artifact",
    "page-builder-visual-fixture-123",
    "--visual-artifact-run-id",
    "123",
    "--local-verification-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/122",
    "--local-verification-artifact",
    "local-verification-122",
    "--release-tag",
    "v0.1.0",
    "--rollback-target",
    "main@abcdef1",
    "--storefront-url",
    "https://store.brand.com",
  ]);

  assert.deepEqual(config.outputPaths, {
    productionSmoke: "tmp/smoke.md",
    productionSmokeInputs: "tmp/smoke-inputs.txt",
    releaseEvidence: "tmp/release.md",
    visualMissingReferences: "tmp/missing.txt",
    visualReference: "tmp/visual.md",
  });
  assert.deepEqual(config.visualReferenceArgs, [
    "--output",
    "tmp/visual.md",
    "--missing-output",
    "tmp/missing.txt",
    "--source-dir",
    "docs/visual/page-builder-references",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
  assert.equal(readOptionValue(config.productionSmokeArgs, "--output"), "tmp/smoke.md");
  assert.equal(
    readOptionValue(config.productionSmokeArgs, "--inputs-output"),
    "tmp/smoke-inputs.txt",
  );
  assert.ok(config.releaseEvidenceArgs.includes("--smoke-report"));
  assert.ok(config.releaseEvidenceArgs.includes("--visual-artifact-dir"));
  assert.ok(config.releaseEvidenceArgs.includes("--visual-artifact"));
  assert.ok(config.productionSmokeArgs.includes("--visual-artifact"));
  assert.ok(!config.visualReferenceArgs.includes("--visual-artifact"));
  assert.equal(
    config.visualReferenceArgs.filter((arg) => arg === "--manifest").length,
    1,
  );

  const artifactDirConfig = readReleaseRequestsCliConfig([
    "--visual-artifact-dir",
    "reports/visual/page-builder-fixture",
    "--visual-manifest",
    "reports/visual/alternate/page-builder-visual-acceptance.json",
  ]);

  assert.deepEqual(artifactDirConfig.visualReferenceArgs, [
    "--missing-output",
    "artifacts/visual/page-builder-missing-references.txt",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
});

test("release requests help and summary expose the bundle command", async () => {
  const stdout = [];

  const exitCode = await runReleaseRequestsCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.equal(createReleaseRequestsCommand(), "pnpm release:requests");
  assert.equal(
    createReleaseRequestsOutputSummary(),
    "artifacts/release/release-evidence-request.md, artifacts/visual/page-builder-reference-request.md, artifacts/visual/page-builder-missing-references.txt, artifacts/production-smoke/production-smoke-request.md, artifacts/production-smoke/production-smoke-dispatch-inputs.txt",
  );
  assert.match(help, /refreshes all local evidence request files/);
  assert.match(help, /--visual-missing-output <path>/);
  assert.match(help, /--smoke-inputs-output <path>/);
  assert.match(help, /does not import\s+visual references, run\s+Production Smoke/);
});

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
  assert.match(setupDoc, /pnpm release:requests/);
  assert.match(readme, /pnpm release:requests/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function readOptionValue(args, option) {
  const index = args.indexOf(option);

  return index === -1 ? null : args[index + 1];
}
