import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import test from "node:test";
import {
  createReleaseEvidenceRequest,
  createReleaseEvidenceRequestMarkdown,
  readReleaseEvidenceRequestCliConfig,
  runReleaseEvidenceRequestCli,
} from "./release-evidence-request.mjs";
import { normalizeReleaseEvidenceRequestOutputPath } from "./release-evidence-request-config.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release evidence request Markdown combines blocked evidence handoffs", async () => {
  const root = `tmp/release-evidence-request-md-${process.pid}-${Date.now()}`;
  const visualManifest = createPendingVisualManifest();

  try {
    await mkdir(root, { recursive: true });
    const request = await createReleaseEvidenceRequest(
      readReleaseEvidenceRequestCliConfig([]),
      {
        smokeArtifact: { error: new Error("No smoke reports found.") },
        visualManifest,
        visualReferenceManifest: visualManifest,
        visualReferenceRoot: root,
      },
      "2026-09-01T00:00:00.000Z",
    );
    const markdown = createReleaseEvidenceRequestMarkdown(request);

    assert.equal(request.projectArtifact.releaseReady, false);
    assert.equal(request.visualReferenceArtifact.missingCount, 12);
    assert.match(markdown, /^# MVP Release Evidence Request/m);
    assert.match(markdown, /Release ready: `no`/);
    assert.match(markdown, /Release evidence request: `pnpm release:evidence-request`/);
    assert.match(markdown, /Page Builder design request: `pnpm visual:references:request`/);
    assert.match(markdown, /Production Smoke request: `pnpm smoke:request`/);
    assert.match(markdown, /## Page Builder Design Reference Request/);
    assert.match(
      markdown,
      /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.match(markdown, /## Production Smoke Evidence Request/);
    assert.match(markdown, /`visual_artifact_name`: `page-builder-visual-fixture-<run_number>`/);
    assert.match(markdown, /Do not mark the project complete from this request alone/);
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
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("release evidence request config validates paths and inputs", () => {
  const config = readReleaseEvidenceRequestCliConfig([
    "--",
    "--output",
    String.raw`artifacts\\release\\release-evidence-request.md`,
    "--visual-source-dir",
    "docs/visual/page-builder-references",
    "--visual-artifact-dir",
    "reports/visual/page-builder-fixture",
    "--visual-artifact-run-id=33400968157",
  ]);

  assert.equal(
    config.outputPath,
    "artifacts/release/release-evidence-request.md",
  );
  assert.equal(config.visualSourceDir, "docs/visual/page-builder-references");
  assert.equal(
    config.visualManifestPath,
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  );
  assert.equal(
    config.releaseCheckConfig.visualArtifactDir,
    "reports/visual/page-builder-fixture",
  );
  assert.equal(
    config.smokeDispatchConfig.inputOverrides.get("visual_artifact_run_id"),
    "33400968157",
  );
  assert.equal(
    normalizeReleaseEvidenceRequestOutputPath("tmp/release-request.MD"),
    "tmp/release-request.MD",
  );
  assert.throws(
    () => normalizeReleaseEvidenceRequestOutputPath("README.md"),
    /Release evidence request must (use safe path segments under|be under) docs\/releases, artifacts\/release, reports\/release, tmp\/, or \.tmp\//,
  );
});

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
  assert.match(setupDoc, /pnpm release:evidence-request/);
  assert.match(readme, /pnpm release:evidence-request/);
});
