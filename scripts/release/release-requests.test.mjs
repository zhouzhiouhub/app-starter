import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { runReleaseRequestsCli } from "./release-requests.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release requests CLI writes every local request Markdown", async () => {
  const root = `tmp/rr-cli-${process.pid}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const releaseOutput = `${root}/release-evidence-request.md`;
  const releaseRequestsManifestOutput = `${root}/release-requests-manifest.json`;
  const visualOutput = `${root}/page-builder-reference-request.md`;
  const visualMissingOutput = `${root}/page-builder-missing-references.txt`;
  const visualTableOutput = `${root}/page-builder-reference-export-table.tsv`;
  const visualJsonOutput = `${root}/page-builder-reference-export-manifest.json`;
  const visualHandoffOutput = `${root}/page-builder-reference-handoff`;
  const smokeOutput = `${root}/production-smoke-request.md`;
  const smokeInputsOutput = `${root}/production-smoke-dispatch-inputs.txt`;
  const smokeInputsTableOutput = `${root}/production-smoke-dispatch-inputs.tsv`;
  const smokeInputsJsonOutput = `${root}/production-smoke-dispatch-inputs.json`;
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
        "--requests-manifest-output",
        releaseRequestsManifestOutput,
        "--visual-output",
        visualOutput,
        "--visual-missing-output",
        visualMissingOutput,
        "--visual-table-output",
        visualTableOutput,
        "--visual-json-output",
        visualJsonOutput,
        "--visual-handoff-output",
        visualHandoffOutput,
        "--smoke-output",
        smokeOutput,
        "--smoke-inputs-output",
        smokeInputsOutput,
        "--smoke-inputs-table-output",
        smokeInputsTableOutput,
        "--smoke-inputs-json-output",
        smokeInputsJsonOutput,
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
      releaseRequestsManifestText,
      visualMarkdown,
      visualMissingPaths,
      visualExportTable,
      visualExportManifestText,
      visualHandoffManifestText,
      smokeMarkdown,
      smokeInputsText,
      smokeInputsTable,
      smokeInputsJsonText,
    ] = await Promise.all([
      readFile(releaseOutput, "utf8"),
      readFile(releaseRequestsManifestOutput, "utf8"),
      readFile(visualOutput, "utf8"),
      readFile(visualMissingOutput, "utf8"),
      readFile(visualTableOutput, "utf8"),
      readFile(visualJsonOutput, "utf8"),
      readFile(`${visualHandoffOutput}/page-builder-reference-handoff.json`, "utf8"),
      readFile(smokeOutput, "utf8"),
      readFile(smokeInputsOutput, "utf8"),
      readFile(smokeInputsTableOutput, "utf8"),
      readFile(smokeInputsJsonOutput, "utf8"),
    ]);
    const releaseRequestsManifest = JSON.parse(releaseRequestsManifestText);
    const visualExportManifest = JSON.parse(visualExportManifestText);
    const visualHandoffManifest = JSON.parse(visualHandoffManifestText);
    const smokeInputsManifest = JSON.parse(smokeInputsJsonText);
    const output = stdout.join("\n");

    assert.equal(exitCode, 0);
    assert.match(output, /Release evidence request bundle/);
    assert.match(
      output,
      new RegExp(
        `Release requests manifest written: ${escapeRegExp(
          releaseRequestsManifestOutput,
        )}`,
      ),
    );
    assert.match(output, /Release request files refreshed:/);
    assert.match(output, new RegExp(`Release evidence: ${escapeRegExp(releaseOutput)}`));
    assert.match(
      output,
      new RegExp(
        `Release requests manifest: ${escapeRegExp(
          releaseRequestsManifestOutput,
        )}`,
      ),
    );
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
    assert.match(
      output,
      new RegExp(`Page Builder handoff package: ${escapeRegExp(visualHandoffOutput)}`),
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
    assert.match(
      output,
      new RegExp(
        `Production Smoke inputs JSON: ${escapeRegExp(smokeInputsJsonOutput)}`,
      ),
    );
    assert.match(releaseMarkdown, /^# MVP Release Evidence Request/m);
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Refresh all requests: \`pnpm release:requests -- --release-output ${escapeRegExp(
          releaseOutput,
        )} --requests-manifest-output ${escapeRegExp(
          releaseRequestsManifestOutput,
        )} --visual-output ${escapeRegExp(
          visualOutput,
        )} --visual-missing-output ${escapeRegExp(
          visualMissingOutput,
        )} --visual-table-output ${escapeRegExp(
          visualTableOutput,
        )} --visual-json-output ${escapeRegExp(
          visualJsonOutput,
        )} --visual-handoff-output ${escapeRegExp(
          visualHandoffOutput,
        )} --smoke-output ${escapeRegExp(
          smokeOutput,
        )} --smoke-inputs-output ${escapeRegExp(
          smokeInputsOutput,
        )} --smoke-inputs-table-output ${escapeRegExp(
          smokeInputsTableOutput,
        )} --smoke-inputs-json-output ${escapeRegExp(
          smokeInputsJsonOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Request outputs: \`${escapeRegExp(
          [
            releaseOutput,
            releaseRequestsManifestOutput,
            visualOutput,
            visualMissingOutput,
            visualTableOutput,
            visualJsonOutput,
            visualHandoffOutput,
            smokeOutput,
            smokeInputsOutput,
            smokeInputsTableOutput,
            smokeInputsJsonOutput,
          ].join(", "),
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Release evidence request: \`pnpm release:evidence-request -- --output ${escapeRegExp(
          releaseOutput,
        )} --requests-manifest-output ${escapeRegExp(
          releaseRequestsManifestOutput,
        )} --visual-output ${escapeRegExp(
          visualOutput,
        )} --visual-missing-output ${escapeRegExp(
          visualMissingOutput,
        )} --visual-table-output ${escapeRegExp(
          visualTableOutput,
        )} --visual-json-output ${escapeRegExp(
          visualJsonOutput,
        )} --visual-handoff-output ${escapeRegExp(
          visualHandoffOutput,
        )} --smoke-output ${escapeRegExp(
          smokeOutput,
        )} --smoke-inputs-output ${escapeRegExp(
          smokeInputsOutput,
        )} --smoke-inputs-table-output ${escapeRegExp(
          smokeInputsTableOutput,
        )} --smoke-inputs-json-output ${escapeRegExp(
          smokeInputsJsonOutput,
        )}\``,
      ),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Release requests manifest: \`${escapeRegExp(
          releaseRequestsManifestOutput,
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
      new RegExp(`Page Builder design handoff output: \`${escapeRegExp(visualHandoffOutput)}\``),
    );
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Production Smoke request: \`pnpm smoke:request -- --output ${escapeRegExp(
          smokeOutput,
        )} --inputs-output ${escapeRegExp(
          smokeInputsOutput,
        )} --inputs-table-output ${escapeRegExp(
          smokeInputsTableOutput,
        )} --inputs-json-output ${escapeRegExp(smokeInputsJsonOutput)}\``,
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
        `Production Smoke dispatch inputs JSON output: \`${escapeRegExp(
          smokeInputsJsonOutput,
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
    assert.match(
      releaseMarkdown,
      new RegExp(
        `Dispatch inputs JSON output: \`${escapeRegExp(
          smokeInputsJsonOutput,
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
    assert.equal(
      releaseRequestsManifest.schemaVersion,
      "release-requests-manifest.v1",
    );
    assert.equal(releaseRequestsManifest.status, "needs-evidence");
    assert.equal(releaseRequestsManifest.releaseEvidence.ready, false);
    assert.equal(
      releaseRequestsManifest.outputPaths.releaseRequestsManifest,
      releaseRequestsManifestOutput,
    );
    assert.equal(releaseRequestsManifest.pageBuilderVisual.missingCount, 12);
    assert.equal(
      releaseRequestsManifest.pageBuilderVisual.firstMissingReference,
      "docs/visual/page-builder-references/hero-banner-desktop.png",
    );
    assert.equal(
      releaseRequestsManifest.productionSmoke.validationCommand,
      `pnpm smoke:dispatch -- --inputs-json ${smokeInputsJsonOutput} --require-complete`,
    );
    assert.match(
      releaseRequestsManifest.productionSmoke.dispatchCommand,
      /^gh workflow run production-smoke\.yml --ref main /,
    );
    assert.deepEqual(releaseRequestsManifest.productionSmoke.missingInputs, [
      "visual_artifact_name",
      "visual_artifact_run_id",
      "local_verification_run_url",
      "local_verification_artifact_name",
      "release_tag",
      "rollback_target",
      "storefront_url",
    ]);
    assert.equal(visualHandoffManifest.schemaVersion, "page-builder-visual-reference-handoff.v1");
    assert.equal(visualHandoffManifest.outputDir, visualHandoffOutput);
    assert.equal(visualHandoffManifest.previewCount, 12);
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
    assert.equal(
      smokeInputsManifest.schemaVersion,
      "production-smoke-dispatch-inputs.v1",
    );
    assert.equal(smokeInputsManifest.status, "needs-inputs");
    assert.equal(smokeInputsManifest.inputCount, 7);
    assert.equal(smokeInputsManifest.missingInputCount, 7);
    assert.equal(smokeInputsManifest.inputs[0].source, "Page Builder Visual workflow artifact after visual evidence passes");
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
