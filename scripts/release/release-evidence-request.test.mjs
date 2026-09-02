import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import test from "node:test";
import {
  runReleaseEvidenceRequestCli,
} from "./release-evidence-request.mjs";
import { assertReleaseEvidenceRequestMarkdownHandoff } from "./release-evidence-request-markdown-test-assertions.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release evidence request Markdown combines blocked evidence handoffs", async () => {
  const root = `tmp/re-md-${process.pid}`;
  const visualManifest = createPendingVisualManifest();

  try {
    await mkdir(root, { recursive: true });
    await assertReleaseEvidenceRequestMarkdownHandoff({
      root,
      visualManifest,
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release evidence request CLI writes a combined handoff", async () => {
  const root = `tmp/release-evidence-request-cli-${process.pid}-${Date.now()}`;
  const outputPath = `${root}/request.md`;
  const visualManifest = createPendingVisualManifest();
  const stdout = [];

  try {
    await mkdir(root, { recursive: true });
    const exitCode = await runReleaseEvidenceRequestCli(
      [
        "--output",
        outputPath,
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
      ],
      {
        generatedAt: "2026-09-01T00:00:00.000Z",
        smokeArtifact: { error: new Error("No smoke reports found.") },
        stdout: (line) => stdout.push(line),
        visualManifest,
        visualReferenceManifest: visualManifest,
        visualReferenceRoot: root,
      },
    );
    const markdown = await readFile(outputPath, "utf8");

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Release evidence request written:/);
    assert.match(stdout.join("\n"), /Release ready: no/);
    assert.match(stdout.join("\n"), /Visual references: needs-evidence \(12\/12 missing\)/);
    assert.match(
      stdout.join("\n"),
      /First missing visual reference: docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.match(stdout.join("\n"), /Production Smoke dispatch ready: yes/);
    assert.doesNotMatch(stdout.join("\n"), /Missing Production Smoke inputs:/);
    assert.match(markdown, /Status: `ready-to-dispatch`/);
    assert.match(markdown, /- \[x\] `storefront_url`: `https:\/\/store\.brand\.com\/` - ready/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release evidence request CLI prints missing smoke inputs", async () => {
  const root = `tmp/release-evidence-request-missing-${process.pid}-${Date.now()}`;
  const outputPath = `${root}/request.md`;
  const visualManifest = createPendingVisualManifest();
  const stdout = [];

  try {
    await mkdir(root, { recursive: true });
    const exitCode = await runReleaseEvidenceRequestCli(
      ["--output", outputPath],
      {
        generatedAt: "2026-09-01T00:00:00.000Z",
        smokeArtifact: { error: new Error("No smoke reports found.") },
        stdout: (line) => stdout.push(line),
        visualManifest,
        visualReferenceManifest: visualManifest,
        visualReferenceRoot: root,
      },
    );

    assert.equal(exitCode, 0);
    assert.match(stdout.join("\n"), /Production Smoke dispatch ready: no/);
    assert.match(
      stdout.join("\n"),
      /Missing Production Smoke inputs: visual_artifact_name, visual_artifact_run_id, local_verification_run_url/,
    );
    assert.match(
      stdout.join("\n"),
      /First missing visual reference: docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release evidence request help documents terminal summary fields", async () => {
  const stdout = [];

  const exitCode = await runReleaseEvidenceRequestCli(["--help"], {
    stdout: (line) => stdout.push(line),
  });
  const help = stdout.join("\n");

  assert.equal(exitCode, 0);
  assert.match(help, /terminal summary\s+and Markdown request status report release\s+readiness/i);
  assert.match(help, /first missing visual\s+reference/i);
  assert.match(help, /missing Smoke input\s+names/i);
  assert.match(help, /dispatch input template\s+path/i);
  assert.match(help, /--visual-output <path>/);
  assert.match(help, /--requests-manifest-output <path>/);
  assert.match(help, /--bundle-manifest-output <path>/);
  assert.match(help, /--visual-missing-output <path>/);
  assert.match(help, /--missing-output <path>/);
  assert.match(help, /--visual-table-output <path>/);
  assert.match(help, /--table-output <path>/);
  assert.match(help, /--visual-json-output <path>/);
  assert.match(help, /--json-output <path>/);
  assert.match(help, /--visual-handoff-output <dir>/);
  assert.match(help, /--handoff-output-dir <dir>/);
  assert.match(help, /--smoke-output <path>/);
  assert.match(help, /--smoke-inputs-output <path>/);
  assert.match(help, /--smoke-inputs-table-output <path>/);
  assert.match(help, /--smoke-inputs-json-output <path>/);
  assert.match(help, /--inputs-output <path>/);
  assert.match(help, /--inputs-json-output <path>/);
});
