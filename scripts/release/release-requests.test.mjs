import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  readReleaseRequestsCliConfig,
  runReleaseRequestsCli,
} from "./release-requests.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release requests CLI writes every local request Markdown", async () => {
  const root = `tmp/rr-cli-${process.pid}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const releaseOutput = `${root}/release-evidence-request.md`;
  const visualOutput = `${root}/page-builder-reference-request.md`;
  const visualMissingOutput = `${root}/page-builder-missing-references.txt`;
  const visualTableOutput = `${root}/page-builder-reference-export-table.tsv`;
  const visualJsonOutput = `${root}/page-builder-reference-export-manifest.json`;
  const smokeOutput = `${root}/production-smoke-request.md`;
  const smokeInputsOutput = `${root}/production-smoke-dispatch-inputs.txt`;
  const smokeInputsTableOutput = `${root}/production-smoke-dispatch-inputs.tsv`;
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
        "--visual-table-output",
        visualTableOutput,
        "--visual-json-output",
        visualJsonOutput,
        "--smoke-output",
        smokeOutput,
        "--smoke-inputs-output",
        smokeInputsOutput,
        "--smoke-inputs-table-output",
        smokeInputsTableOutput,
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
      visualExportTable,
      visualExportManifestText,
      smokeMarkdown,
      smokeInputsText,
      smokeInputsTable,
    ] = await Promise.all([
      readFile(releaseOutput, "utf8"),
      readFile(visualOutput, "utf8"),
      readFile(visualMissingOutput, "utf8"),
      readFile(visualTableOutput, "utf8"),
      readFile(visualJsonOutput, "utf8"),
      readFile(smokeOutput, "utf8"),
      readFile(smokeInputsOutput, "utf8"),
      readFile(smokeInputsTableOutput, "utf8"),
    ]);
    const visualExportManifest = JSON.parse(visualExportManifestText);
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
    assert.match(
      output,
      new RegExp(`Page Builder export table: ${escapeRegExp(visualTableOutput)}`),
    );
    assert.match(
      output,
      new RegExp(
        `Page Builder export manifest: ${escapeRegExp(visualJsonOutput)}`,
      ),
    );
    assert.match(output, new RegExp(`Production Smoke: ${escapeRegExp(smokeOutput)}`));
    assert.match(
      output,
      new RegExp(`Production Smoke inputs: ${escapeRegExp(smokeInputsOutput)}`),
    );
    assert.match(
      output,
      new RegExp(
        `Production Smoke inputs table: ${escapeRegExp(smokeInputsTableOutput)}`,
      ),
    );
    assert.match(releaseMarkdown, /^# MVP Release Evidence Request/m);
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Refresh all requests: \`pnpm release:requests -- --release-output ${escapeRegExp(
          releaseOutput,
        )} --visual-output ${escapeRegExp(
          visualOutput,
        )} --visual-missing-output ${escapeRegExp(
          visualMissingOutput,
        )} --visual-table-output ${escapeRegExp(
          visualTableOutput,
        )} --visual-json-output ${escapeRegExp(
          visualJsonOutput,
        )} --smoke-output ${escapeRegExp(
          smokeOutput,
        )} --smoke-inputs-output ${escapeRegExp(
          smokeInputsOutput,
        )} --smoke-inputs-table-output ${escapeRegExp(
          smokeInputsTableOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Request outputs: \`${escapeRegExp(
          [
            releaseOutput,
            visualOutput,
            visualMissingOutput,
            visualTableOutput,
            visualJsonOutput,
            smokeOutput,
            smokeInputsOutput,
            smokeInputsTableOutput,
          ].join(", "),
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Release evidence request: \`pnpm release:evidence-request -- --output ${escapeRegExp(
          releaseOutput,
        )} --visual-output ${escapeRegExp(
          visualOutput,
        )} --visual-missing-output ${escapeRegExp(
          visualMissingOutput,
        )} --visual-table-output ${escapeRegExp(
          visualTableOutput,
        )} --visual-json-output ${escapeRegExp(
          visualJsonOutput,
        )} --smoke-output ${escapeRegExp(
          smokeOutput,
        )} --smoke-inputs-output ${escapeRegExp(
          smokeInputsOutput,
        )} --smoke-inputs-table-output ${escapeRegExp(
          smokeInputsTableOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Page Builder design request: \`pnpm visual:references:request -- --manifest ${escapeRegExp(
          manifestPath,
        )} --output ${escapeRegExp(
          visualOutput,
        )} --missing-output ${escapeRegExp(
          visualMissingOutput,
        )} --table-output ${escapeRegExp(
          visualTableOutput,
        )} --json-output ${escapeRegExp(visualJsonOutput)}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Page Builder reference export manifest: \`${escapeRegExp(
          visualJsonOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Production Smoke request: \`pnpm smoke:request -- --output ${escapeRegExp(
          smokeOutput,
        )} --inputs-output ${escapeRegExp(
          smokeInputsOutput,
        )} --inputs-table-output ${escapeRegExp(smokeInputsTableOutput)}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Missing path output: \`${escapeRegExp(visualMissingOutput)}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Export table output: \`${escapeRegExp(visualTableOutput)}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Export manifest output: \`${escapeRegExp(visualJsonOutput)}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Production Smoke dispatch inputs output: \`${escapeRegExp(
          smokeInputsOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Production Smoke dispatch inputs table output: \`${escapeRegExp(
          smokeInputsTableOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Dispatch inputs output: \`${escapeRegExp(smokeInputsOutput)}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Dispatch inputs table output: \`${escapeRegExp(
          smokeInputsTableOutput,
        )}\``,
      ),
    );
    assert.match(visualMarkdown, /^# Page Builder Design Reference Request/m);
    assert.match(
      visualMissingPaths,
      /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.match(
      visualExportTable,
      /^component\tviewport\tstatus\treference_width\treference_height\texpected_path\tpreview_width\tpreview_height\tpreview_path/m,
    );
    assert.match(
      visualExportTable,
      /hero-banner\tdesktop\tmissing\t[^\n]*docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.equal(
      visualExportManifest.schemaVersion,
      "page-builder-visual-reference-export.v1",
    );
    assert.equal(visualExportManifest.referenceCount, 12);
    assert.equal(visualExportManifest.missingCount, 12);
    assert.match(smokeMarkdown, /^# Production Smoke Evidence Request/m);
    assert.match(
      smokeMarkdown,
      new RegExp(
        `Dispatch inputs output: \`${escapeRegExp(smokeInputsOutput)}\``,
      ),
    );
    assert.match(
      smokeInputsText,
      /^visual_artifact_name=page-builder-visual-fixture-<run_number>/m,
    );
    assert.match(
      smokeInputsTable,
      /^name\tstatus\tvalue\tsource\tworkflow_required\tworkflow_description/m,
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
    "--visual-table-output",
    "tmp/reference-table.tsv",
    "--visual-json-output",
    "tmp/reference-manifest.json",
    "--smoke-output",
    "tmp/smoke.md",
    "--smoke-inputs-output",
    "tmp/smoke-inputs.txt",
    "--smoke-inputs-table-output",
    "tmp/smoke-inputs.tsv",
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
    productionSmokeInputsTable: "tmp/smoke-inputs.tsv",
    releaseEvidence: "tmp/release.md",
    visualMissingReferences: "tmp/missing.txt",
    visualReference: "tmp/visual.md",
    visualReferenceManifest: "tmp/reference-manifest.json",
    visualReferenceTable: "tmp/reference-table.tsv",
  });
  assert.deepEqual(config.visualReferenceArgs, [
    "--output",
    "tmp/visual.md",
    "--missing-output",
    "tmp/missing.txt",
    "--table-output",
    "tmp/reference-table.tsv",
    "--json-output",
    "tmp/reference-manifest.json",
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
  assert.equal(
    readOptionValue(config.productionSmokeArgs, "--inputs-table-output"),
    "tmp/smoke-inputs.tsv",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-output"),
    "tmp/visual.md",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-missing-output"),
    "tmp/missing.txt",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-table-output"),
    "tmp/reference-table.tsv",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--visual-json-output"),
    "tmp/reference-manifest.json",
  );
  assert.equal(
    readOptionValue(config.visualReferenceArgs, "--table-output"),
    "tmp/reference-table.tsv",
  );
  assert.equal(
    readOptionValue(config.visualReferenceArgs, "--json-output"),
    "tmp/reference-manifest.json",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-output"),
    "tmp/smoke.md",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-inputs-output"),
    "tmp/smoke-inputs.txt",
  );
  assert.equal(
    readOptionValue(config.releaseEvidenceArgs, "--smoke-inputs-table-output"),
    "tmp/smoke-inputs.tsv",
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
    "--table-output",
    "artifacts/visual/page-builder-reference-export-table.tsv",
    "--json-output",
    "artifacts/visual/page-builder-reference-export-manifest.json",
    "--manifest",
    "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
  ]);
});


function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function readOptionValue(args, option) {
  const index = args.indexOf(option);

  return index === -1 ? null : args[index + 1];
}
