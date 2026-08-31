import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  runProductionSmokeReleaseInputsCli,
  validateProductionSmokeReleaseInputs,
} from "./production-smoke-release-inputs.mjs";

test("production smoke preflight CLI writes passed JSON and Markdown reports", async () => {
  await withTempReportDir(async (dir) => {
    const jsonPath = join(dir, "preflight.json");
    const markdownPath = join(dir, "preflight.md");
    const normalizedJsonPath = normalizeTestPath(jsonPath);
    const normalizedMarkdownPath = normalizeTestPath(markdownPath);
    const stdout = [];
    const exitCode = await runProductionSmokeReleaseInputsCli(
      ["--json-output", jsonPath, "--markdown-output", markdownPath],
      {
        env: { APP_ENV: "development" },
        stdout: (line) => stdout.push(line),
      },
    );

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /releaseNotes=disabled/);

    const report = await readJsonReport(jsonPath);
    assert.equal(report.schemaVersion, "production-smoke-preflight.v1");
    assert.equal(report.status, "passed");
    assert.equal(report.productionRuntimeReadinessRequired, false);
    assert.equal(report.releaseNotesEnabled, false);
    assert.equal(report.releaseNotesAllowBlocked, false);
    assert.equal(report.visualArtifactDownloadEnabled, false);
    assert.equal(
      report.workflowArtifacts.paths.smokeReportJson,
      "artifacts/production-smoke/smoke-report.json",
    );
    assert.equal(
      report.workflowArtifacts.paths.preflightJson,
      normalizedJsonPath,
    );
    assert.equal(
      report.workflowArtifacts.paths.preflightMarkdown,
      normalizedMarkdownPath,
    );
    assert.equal(
      report.workflowArtifacts.artifactNames.smokeReport,
      "production-smoke-report-local",
    );
    assert.equal(
      report.workflowArtifacts.artifactNames.releasePreflight,
      "release-preflight-local",
    );
    assert.equal(report.error, null);

    const markdown = await readFile(markdownPath, "utf8");
    assert.match(markdown, /# Production Smoke Preflight/);
    assert.match(markdown, /Status: `passed`/);
    assert.match(markdown, /Production runtime readiness required: no/);
    assert.match(markdown, /## Workflow Artifacts/);
    assert.match(markdown, /Smoke report JSON/);
    assert.match(markdown, /Preflight JSON/);
    assert.match(markdown, /Release check artifact/);
    assert.match(markdown, /## Failure[\s\S]*- None/);
  });
});

test("production smoke preflight CLI writes failed reports before smoke requests", async () => {
  await withTempReportDir(async (dir) => {
    const jsonPath = join(dir, "preflight.json");
    const markdownPath = join(dir, "preflight.md");
    const normalizedJsonPath = normalizeTestPath(jsonPath);
    const stderr = [];
    const exitCode = await runProductionSmokeReleaseInputsCli(
      ["--json-output", jsonPath, "--markdown-output", markdownPath],
      {
        env: { APP_ENV: "production" },
        stderr: (line) => stderr.push(line),
      },
    );

    assert.equal(exitCode, 1);
    assert.match(
      stderr.join("\n"),
      /Production smoke release input validation failed/,
    );

    const report = await readJsonReport(jsonPath);
    assert.equal(report.schemaVersion, "production-smoke-preflight.v1");
    assert.equal(report.status, "failed");
    assert.equal(report.productionRuntimeReadinessRequired, true);
    assert.equal(report.releaseNotesEnabled, null);
    assert.equal(report.releaseNotesAllowBlocked, null);
    assert.equal(report.visualArtifactDownloadEnabled, null);
    assert.equal(
      report.workflowArtifacts.paths.preflightJson,
      normalizedJsonPath,
    );
    assert.equal(
      report.workflowArtifacts.artifactNames.releasePreflight,
      "release-preflight-local",
    );
    assert.match(
      report.error.message,
      /Production smoke runtime readiness failed before smoke requests/,
    );
    assert.match(report.error.message, /Next actions:/);

    const markdown = await readFile(markdownPath, "utf8");
    assert.match(markdown, /Status: `failed`/);
    assert.match(markdown, /Production runtime readiness required: yes/);
    assert.match(markdown, /Next actions:/);
  });
});

test("production smoke preflight CLI validates report outputs and artifact name", async () => {
  const stderr = [];
  const exitCode = await runProductionSmokeReleaseInputsCli(
    ["--json-output", "README.md"],
    {
      env: {},
      stderr: (line) => stderr.push(line),
    },
  );

  assert.equal(exitCode, 1);
  assert.match(stderr.join("\n"), /Preflight report must be under tmp\//);
  assert.throws(
    () =>
      validateProductionSmokeReleaseInputs({
        RELEASE_PREFLIGHT_ARTIFACT_NAME: "release preflight",
      }),
    /Release preflight artifact must use 1-160 safe characters/,
  );
});

test("production smoke preflight CLI help documents report outputs", async () => {
  const stdout = [];
  const exitCode = await runProductionSmokeReleaseInputsCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.join("\n"), /--json-output/);
  assert.match(stdout.join("\n"), /--markdown-output/);
});

async function withTempReportDir(run) {
  const dir = join("tmp", `production-smoke-preflight-${randomUUID()}`);

  await mkdir(dir, { recursive: true });

  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function readJsonReport(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeTestPath(path) {
  return path.replaceAll("\\", "/");
}
