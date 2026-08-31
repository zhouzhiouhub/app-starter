import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createProductionSmokeDispatchCommand,
} from "../smoke/production-smoke-dispatch-command.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createPendingVisualManifest,
  createVisualArtifactCheck,
} from "./release-check-test-fixtures.mjs";
import {
  printReleaseHandoffHelp,
  readReleaseHandoffCliConfig,
  runReleaseHandoffCli,
} from "./release-handoff.mjs";
import {
  createOutputRoot,
  escapeRegExp,
  readJson,
} from "./release-handoff-test-helpers.mjs";

test("release handoff writes blocked reports without requiring readiness", async () => {
  const outputRoot = createOutputRoot("blocked");
  const smokeRoot = mkdtempSync(path.join(tmpdir(), "release-handoff-smoke-"));
  const dispatchCommand = createProductionSmokeDispatchCommand();
  const stdout = [];

  try {
    const exitCode = await runReleaseHandoffCli(
      [
        "--visual-artifact-dir",
        "reports/visual/page-builder-fixture",
        "--release-check-output",
        `${outputRoot}/release-check.json`,
        "--release-check-markdown",
        `${outputRoot}/release-check.md`,
        "--project-status-output",
        `${outputRoot}/project-status.json`,
        "--project-status-markdown",
        `${outputRoot}/project-status.md`,
        "--preflight-output",
        `${outputRoot}/preflight.json`,
        "--preflight-markdown",
        `${outputRoot}/preflight.md`,
      ],
      {
        env: { APP_ENV: "development" },
        generatedAt: "2026-08-29T00:00:00.000Z",
        smokeRoots: [smokeRoot],
        stdout: (line) => stdout.push(line),
        visualArtifact: createVisualArtifactCheck({ status: "complete" }),
        visualManifest: createPendingVisualManifest(),
      },
    );
    const releaseArtifact = await readJson(`${outputRoot}/release-check.json`);
    const preflightArtifact = await readJson(`${outputRoot}/preflight.json`);
    const projectArtifact = await readJson(`${outputRoot}/project-status.json`);
    const preflightMarkdown = await readFile(
      `${outputRoot}/preflight.md`,
      "utf8",
    );
    const releaseMarkdown = await readFile(
      `${outputRoot}/release-check.md`,
      "utf8",
    );
    const projectMarkdown = await readFile(
      `${outputRoot}/project-status.md`,
      "utf8",
    );

    assert.equal(exitCode, 0);
    assert.equal(releaseArtifact.status, "blocked");
    assert.equal(releaseArtifact.blockerCount, 8);
    assert.equal(releaseArtifact.visual.artifactCheck.status, "complete");
    assert.equal(
      preflightArtifact.schemaVersion,
      "production-smoke-preflight.v1",
    );
    assert.equal(preflightArtifact.status, "passed");
    assert.equal(projectArtifact.status, "needs-evidence");
    assert.equal(projectArtifact.nextActionCount, 14);
    assert.match(preflightMarkdown, /# Production Smoke Preflight/);
    assert.match(releaseMarkdown, /# Release Evidence Check/);
    assert.match(projectMarkdown, /# MVP Release Handoff/);
    assert.match(stdout.join("\n"), /Release handoff written:/);
    assert.match(stdout.join("\n"), /Release ready: no/);
    assert.match(stdout.join("\n"), /Preflight status: passed/);
    assert.match(stdout.join("\n"), /Preflight JSON:/);
    assert.match(
      stdout.join("\n"),
      /Visual artifact: complete \(reports\/visual\/page-builder-fixture, 6\/6 files, 12\/12 screenshots, 12\/12 manifest-linked design references, references ready \(0 missing, 0 updates, 12\/12 required source references available\)\)/,
    );
    assert.match(stdout.join("\n"), /Next actions: 14/);
    assert.match(stdout.join("\n"), /Next action 1: Production Smoke/);
    assert.match(stdout.join("\n"), /Next action 2: Page Builder Visual/);
    assert.match(
      stdout.join("\n"),
      /Run workflow: GitHub Actions Production Smoke against the production environment/,
    );
    assert.match(
      stdout.join("\n"),
      new RegExp(`Dispatch template: ${escapeRegExp(dispatchCommand)}`),
    );
    assert.match(
      stdout.join("\n"),
      /Rerun gate: pnpm release:check -- --smoke-report <path>/,
    );
    assert.match(
      stdout.join("\n"),
      /Reference source: docs\/visual\/page-builder-references/,
    );
    assert.match(
      stdout.join("\n"),
      /Capture fixture: pnpm visual:capture:fixture -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json/,
    );
    assert.match(
      stdout.join("\n"),
      /Accept passing: pnpm visual:measure -- --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --write --accept-passing --require-complete/,
    );
    assert.doesNotMatch(stdout.join("\n"), /First structured action:/);
    assert.match(
      stdout.join("\n"),
      new RegExp(
        `Remaining next actions: 12 \\(see ${escapeRegExp(
          `${outputRoot}/project-status.md`,
        )} for the full list\\)`,
      ),
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
    await rm(smokeRoot, { force: true, recursive: true });
  }
});

test("release handoff can require ready evidence after writing reports", async () => {
  const outputRoot = createOutputRoot("require-ready");
  const smokeRoot = mkdtempSync(path.join(tmpdir(), "release-handoff-smoke-"));

  try {
    const exitCode = await runReleaseHandoffCli(
      [
        "--require-ready",
        "--release-check-output",
        `${outputRoot}/release-check.json`,
        "--release-check-markdown",
        `${outputRoot}/release-check.md`,
        "--project-status-output",
        `${outputRoot}/project-status.json`,
        "--project-status-markdown",
        `${outputRoot}/project-status.md`,
        "--preflight-output",
        `${outputRoot}/preflight.json`,
        "--preflight-markdown",
        `${outputRoot}/preflight.md`,
      ],
      {
        env: { APP_ENV: "development" },
        smokeRoots: [smokeRoot],
        stdout: () => {},
        visualManifest: createPendingVisualManifest(),
      },
    );

    assert.equal(exitCode, 1);
    assert.equal(
      (await readJson(`${outputRoot}/release-check.json`)).status,
      "blocked",
    );
    assert.equal(
      (await readJson(`${outputRoot}/project-status.json`)).status,
      "needs-evidence",
    );
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
    await rm(smokeRoot, { force: true, recursive: true });
  }
});

test("release handoff accepts ready smoke and visual evidence", async () => {
  const outputRoot = createOutputRoot("ready");
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const stdout = [];

  try {
    const exitCode = await runReleaseHandoffCli(
      [
        "--require-ready",
        "--smoke-report",
        "artifacts/production-smoke/smoke-report.json",
        "--release-check-output",
        `${outputRoot}/release-check.json`,
        "--release-check-markdown",
        `${outputRoot}/release-check.md`,
        "--project-status-output",
        `${outputRoot}/project-status.json`,
        "--project-status-markdown",
        `${outputRoot}/project-status.md`,
        "--preflight-output",
        `${outputRoot}/preflight.json`,
        "--preflight-markdown",
        `${outputRoot}/preflight.md`,
      ],
      {
        env: { APP_ENV: "development" },
        generatedAt: "2026-08-29T00:00:00.000Z",
        smokeArtifact: {
          path: "artifacts/production-smoke/smoke-report.json",
          report: createCompleteReleaseReport(),
        },
        stdout: (line) => stdout.push(line),
        visualEvidenceRoot: evidenceRoot,
        visualManifest: manifest,
      },
    );
    const releaseArtifact = await readJson(`${outputRoot}/release-check.json`);
    const projectArtifact = await readJson(`${outputRoot}/project-status.json`);
    const preflightArtifact = await readJson(`${outputRoot}/preflight.json`);
    const projectMarkdown = await readFile(
      `${outputRoot}/project-status.md`,
      "utf8",
    );
    const stdoutText = stdout.join("\n");
    const readyOutputText = [stdoutText, projectMarkdown].join("\n");

    assert.equal(exitCode, 0);
    assert.equal(releaseArtifact.status, "ready");
    assert.equal(projectArtifact.status, "release-ready");
    assert.equal(preflightArtifact.status, "passed");
    assert.match(stdoutText, /Release ready: yes/);
    assert.match(stdoutText, /Next actions: 1/);
    assert.match(stdoutText, /Next action 1: Release Notes/);
    for (const pattern of [
      /Command: pnpm release:notes -- --release-tag <tag>/,
      /Evidence args: --smoke-artifact production-smoke-report-<run_number>/,
      /Local verification args:/,
      /Project and visual args:/,
      /Formal mode: Run without --allow-blocked/,
      /Release Notes: Generate release record/,
      /Keep artifact: `release-notes-<run_number>`/,
    ]) {
      assert.match(readyOutputText, pattern);
    }
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("release handoff require-ready blocks failed production preflight", async () => {
  const outputRoot = createOutputRoot("preflight-blocked");
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const stdout = [];

  try {
    const exitCode = await runReleaseHandoffCli(
      [
        "--require-ready",
        "--smoke-report",
        "artifacts/production-smoke/smoke-report.json",
        "--release-check-output",
        `${outputRoot}/release-check.json`,
        "--release-check-markdown",
        `${outputRoot}/release-check.md`,
        "--project-status-output",
        `${outputRoot}/project-status.json`,
        "--project-status-markdown",
        `${outputRoot}/project-status.md`,
        "--preflight-output",
        `${outputRoot}/preflight.json`,
        "--preflight-markdown",
        `${outputRoot}/preflight.md`,
      ],
      {
        env: { APP_ENV: "production" },
        generatedAt: "2026-08-29T00:00:00.000Z",
        smokeArtifact: {
          path: "artifacts/production-smoke/smoke-report.json",
          report: createCompleteReleaseReport(),
        },
        stdout: (line) => stdout.push(line),
        visualEvidenceRoot: evidenceRoot,
        visualManifest: manifest,
      },
    );
    const releaseArtifact = await readJson(`${outputRoot}/release-check.json`);
    const projectArtifact = await readJson(`${outputRoot}/project-status.json`);
    const preflightArtifact = await readJson(`${outputRoot}/preflight.json`);

    assert.equal(exitCode, 1);
    assert.equal(releaseArtifact.status, "ready");
    assert.equal(projectArtifact.status, "release-ready");
    assert.equal(preflightArtifact.status, "failed");
    assert.match(
      preflightArtifact.error.message,
      /Production smoke runtime readiness failed before smoke requests/,
    );
    assert.match(stdout.join("\n"), /Release ready: no/);
    assert.match(stdout.join("\n"), /Preflight status: failed/);
  } finally {
    await rm(outputRoot, { force: true, recursive: true });
  }
});

test("release handoff config normalizes paths and is documented", async () => {
  const helpOutput = [];
  const config = readReleaseHandoffCliConfig([
    "--",
    "--smoke-report",
    String.raw`artifacts\\production-smoke\\smoke-report.json`,
    "--visual-artifact-dir",
    String.raw`reports\\visual\\page-builder-fixture`,
    "--release-check-output",
    String.raw`artifacts\\release\\release-check.json`,
    "--release-check-markdown",
    String.raw`artifacts\\release\\release-check.md`,
    "--project-status-output",
    String.raw`artifacts\\release\\project-status.json`,
    "--project-status-markdown",
    String.raw`artifacts\\release\\project-status.md`,
    "--preflight-output",
    String.raw`artifacts\\release\\preflight.json`,
    "--preflight-markdown",
    String.raw`artifacts\\release\\preflight.md`,
  ]);
  const [packageJson, ciWorkflow, readme, setupDoc, releaseChecklist] =
    await Promise.all([
      readFile("package.json", "utf8"),
      readFile(".github/workflows/ci.yml", "utf8"),
      readFile("README.md", "utf8"),
      readFile("docs/development/setup.md", "utf8"),
      readFile("docs/development/release-checklist.md", "utf8"),
    ]);

  assert.equal(config.preflightOutputPath, "artifacts/release/preflight.json");
  assert.equal(config.preflightMarkdownPath, "artifacts/release/preflight.md");
  assert.equal(
    config.releaseCheckOutputPath,
    "artifacts/release/release-check.json",
  );
  assert.equal(
    config.releaseCheckMarkdownPath,
    "artifacts/release/release-check.md",
  );
  assert.equal(
    config.projectStatusOutputPath,
    "artifacts/release/project-status.json",
  );
  assert.equal(
    config.projectStatusMarkdownPath,
    "artifacts/release/project-status.md",
  );
  assert.equal(
    config.smokeReportPath,
    String.raw`artifacts\\production-smoke\\smoke-report.json`,
  );
  assert.equal(
    config.visualArtifactDir,
    String.raw`reports\\visual\\page-builder-fixture`,
  );
  assert.throws(
    () => readReleaseHandoffCliConfig(["--release-check-output", "README.md"]),
    /Release check artifact must use safe path segments/,
  );
  assert.throws(
    () => readReleaseHandoffCliConfig(["--preflight-output", "README.md"]),
    /Preflight report must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.match(
    packageJson,
    /"release:handoff": "node scripts\/release-handoff\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:handoff -- --help/);
  assert.match(readme, /pnpm release:handoff/);
  assert.match(setupDoc, /pnpm release:handoff/);
  assert.match(releaseChecklist, /pnpm release:handoff/);

  printReleaseHandoffHelp((line) => helpOutput.push(line));
  assert.match(
    helpOutput.join("\n"),
    /first two next actions with\s+structured steps.*Production Smoke dispatch\s+template.*first hidden structured.*generated project-status Markdown/s,
  );
  assert.match(
    readme,
    /first two next\s+actions.*structured steps.*structured next action.*artifacts\/release\/project-status\.md/s,
  );
  assert.match(
    setupDoc,
    /first\s+two\s+next actions with structured steps.*Production Smoke dispatch\s+template.*first hidden\s+structured action.*artifacts\/release\/project-status\.md/s,
  );
  assert.match(
    releaseChecklist,
    /first\s+two\s+next actions with\s+structured steps.*Production Smoke dispatch\s+template.*first hidden structured action.*project-status\.md/s,
  );
});
