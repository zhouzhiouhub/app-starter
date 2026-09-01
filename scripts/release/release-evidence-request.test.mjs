import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import test from "node:test";
import {
  createReleaseEvidenceRequest,
  createReleaseEvidenceRequestMarkdown,
  readReleaseEvidenceRequestCliConfig,
  runReleaseEvidenceRequestCli,
} from "./release-evidence-request.mjs";
import {
  createReleaseEvidenceRequestCommand,
  normalizeReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release evidence request Markdown combines blocked evidence handoffs", async () => {
  const root = `tmp/re-md-${process.pid}`;
  const releaseOutputPath = `${root}/release.md`;
  const visualOutputPath = `${root}/visual.md`;
  const visualMissingOutputPath = `${root}/missing.txt`;
  const visualTableOutputPath = `${root}/reference-table.tsv`;
  const smokeOutputPath = `${root}/smoke.md`;
  const smokeInputsOutputPath = `${root}/smoke-inputs.txt`;
  const smokeInputsTableOutputPath = `${root}/smoke-inputs.tsv`;
  const visualManifest = createPendingVisualManifest();

  try {
    await mkdir(root, { recursive: true });
    const request = await createReleaseEvidenceRequest(
      readReleaseEvidenceRequestCliConfig([
        "--output",
        releaseOutputPath,
        "--visual-output",
        visualOutputPath,
        "--visual-missing-output",
        visualMissingOutputPath,
        "--visual-table-output",
        visualTableOutputPath,
        "--smoke-output",
        smokeOutputPath,
        "--smoke-inputs-output",
        smokeInputsOutputPath,
        "--smoke-inputs-table-output",
        smokeInputsTableOutputPath,
      ]),
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
    assert.match(
      markdown,
      new RegExp(
        `Refresh all requests: \`pnpm release:requests -- --release-output ${escapeRegExp(
          releaseOutputPath,
        )} --visual-output ${escapeRegExp(
          visualOutputPath,
        )} --visual-missing-output ${escapeRegExp(
          visualMissingOutputPath,
        )} --visual-table-output ${escapeRegExp(
          visualTableOutputPath,
        )} --smoke-output ${escapeRegExp(
          smokeOutputPath,
        )} --smoke-inputs-output ${escapeRegExp(
          smokeInputsOutputPath,
        )} --smoke-inputs-table-output ${escapeRegExp(
          smokeInputsTableOutputPath,
        )}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Request outputs: \`${escapeRegExp(
          [
            releaseOutputPath,
            visualOutputPath,
            visualMissingOutputPath,
            visualTableOutputPath,
            smokeOutputPath,
            smokeInputsOutputPath,
            smokeInputsTableOutputPath,
          ].join(", "),
        )}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Release evidence request: \`pnpm release:evidence-request -- --output ${escapeRegExp(
          releaseOutputPath,
        )} --visual-output ${escapeRegExp(
          visualOutputPath,
        )} --visual-missing-output ${escapeRegExp(
          visualMissingOutputPath,
        )} --visual-table-output ${escapeRegExp(
          visualTableOutputPath,
        )} --smoke-output ${escapeRegExp(
          smokeOutputPath,
        )} --smoke-inputs-output ${escapeRegExp(
          smokeInputsOutputPath,
        )} --smoke-inputs-table-output ${escapeRegExp(
          smokeInputsTableOutputPath,
        )}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Page Builder design request: \`pnpm visual:references:request -- --output ${escapeRegExp(
          visualOutputPath,
        )} --missing-output ${escapeRegExp(
          visualMissingOutputPath,
        )} --table-output ${escapeRegExp(visualTableOutputPath)}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Production Smoke request: \`pnpm smoke:request -- --output ${escapeRegExp(
          smokeOutputPath,
        )} --inputs-output ${escapeRegExp(
          smokeInputsOutputPath,
        )} --inputs-table-output ${escapeRegExp(smokeInputsTableOutputPath)}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Production Smoke dispatch inputs output: \`${escapeRegExp(
          smokeInputsOutputPath,
        )}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Production Smoke dispatch inputs table output: \`${escapeRegExp(
          smokeInputsTableOutputPath,
        )}\``,
      ),
    );
    assert.match(
      markdown,
      /First missing visual reference: `docs\/visual\/page-builder-references\/hero-banner-desktop\.png`/,
    );
    assert.match(markdown, /## Page Builder Design Reference Request/);
    assert.match(
      markdown,
      /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.match(
      markdown,
      new RegExp(
        `Missing path output: \`${escapeRegExp(visualMissingOutputPath)}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Export table output: \`${escapeRegExp(visualTableOutputPath)}\``,
      ),
    );
    assert.match(markdown, /## Production Smoke Evidence Request/);
    assert.match(
      markdown,
      new RegExp(
        `Dispatch inputs output: \`${escapeRegExp(smokeInputsOutputPath)}\``,
      ),
    );
    assert.match(
      markdown,
      new RegExp(
        `Dispatch inputs table output: \`${escapeRegExp(
          smokeInputsTableOutputPath,
        )}\``,
      ),
    );
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
  assert.match(help, /--visual-missing-output <path>/);
  assert.match(help, /--missing-output <path>/);
  assert.match(help, /--visual-table-output <path>/);
  assert.match(help, /--table-output <path>/);
  assert.match(help, /--smoke-output <path>/);
  assert.match(help, /--smoke-inputs-output <path>/);
  assert.match(help, /--smoke-inputs-table-output <path>/);
  assert.match(help, /--inputs-output <path>/);
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
    "--visual-output",
    String.raw`tmp\\visual.md`,
    "--visual-missing-output",
    String.raw`tmp\\missing.txt`,
    "--visual-table-output",
    String.raw`tmp\\reference-table.tsv`,
    "--smoke-output",
    String.raw`tmp\\smoke.md`,
    "--smoke-inputs-output",
    String.raw`tmp\\smoke-inputs.txt`,
    "--smoke-inputs-table-output",
    String.raw`tmp\\smoke-inputs.tsv`,
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
  assert.deepEqual(config.requestOutputPaths, {
    productionSmoke: "tmp/smoke.md",
    productionSmokeInputs: "tmp/smoke-inputs.txt",
    productionSmokeInputsTable: "tmp/smoke-inputs.tsv",
    releaseEvidence: "artifacts/release/release-evidence-request.md",
    visualMissingReferences: "tmp/missing.txt",
    visualReference: "tmp/visual.md",
    visualReferenceTable: "tmp/reference-table.tsv",
  });
  assert.equal(config.smokeInputsOutputPath, "tmp/smoke-inputs.txt");
  assert.equal(config.smokeInputsTableOutputPath, "tmp/smoke-inputs.tsv");
  assert.equal(
    createReleaseEvidenceRequestCommand(),
    "pnpm release:evidence-request",
  );
  assert.equal(
    createReleaseEvidenceRequestCommand(config.requestOutputPaths),
    "pnpm release:evidence-request -- --output artifacts/release/release-evidence-request.md --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --visual-table-output tmp/reference-table.tsv --smoke-output tmp/smoke.md --smoke-inputs-output tmp/smoke-inputs.txt --smoke-inputs-table-output tmp/smoke-inputs.tsv",
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


function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
