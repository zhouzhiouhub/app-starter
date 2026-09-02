import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { assertReleaseRequestsManifestHandoff } from "./release-requests-manifest-test-assertions.mjs";
import { runReleaseRequestsCli } from "./release-requests.mjs";
import { createPendingVisualManifest } from "./release-check-test-fixtures.mjs";

test("release requests CLI writes every local request Markdown", async () => {
  const root = `tmp/rr-cli-${process.pid}`;
  const manifestPath = `${root}/page-builder-visual-acceptance.json`;
  const projectStatusOutput = `${root}/project-status.json`;
  const projectStatusMarkdownOutput = `${root}/project-status.md`;
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
        "--project-status-output",
        projectStatusOutput,
        "--project-status-markdown",
        projectStatusMarkdownOutput,
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
      projectStatusText,
      projectStatusMarkdown,
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
      readFile(projectStatusOutput, "utf8"),
      readFile(projectStatusMarkdownOutput, "utf8"),
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
    const projectStatus = JSON.parse(projectStatusText);
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
    assert.match(output, /Project completion: needs-evidence/);
    assert.match(
      output,
      new RegExp(
        `Project status handoff: ${escapeRegExp(projectStatusMarkdownOutput)}`,
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
    assert.match(
      output,
      new RegExp(`Project status JSON: ${escapeRegExp(projectStatusOutput)}`),
    );
    assert.match(
      output,
      new RegExp(
        `Project status Markdown: ${escapeRegExp(projectStatusMarkdownOutput)}`,
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
    assert.match(visualMarkdown, /^# Page Builder Design Reference Request/m);
    assert.match(
      visualMissingPaths,
      /docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.match(
      visualExportTable,
      /^component\tviewport\tfile_name\tstatus\treference_width\treference_height\texpected_path\tpreview_width\tpreview_height\tpreview_path/m,
    );
    assert.match(
      visualExportTable,
      /hero-banner\tdesktop\thero-banner-desktop\.png\tmissing\t[^\n]*docs\/visual\/page-builder-references\/hero-banner-desktop\.png/,
    );
    assert.equal(
      visualExportManifest.schemaVersion,
      "page-builder-visual-reference-export.v1",
    );
    assert.equal(projectStatus.schemaVersion, "project-status.v1");
    assert.equal(projectStatus.nextActionCount, 15);
    assert.deepEqual(projectStatus.localVerification.handoff, {
      jsonPath: projectStatusOutput,
      markdownPath: projectStatusMarkdownOutput,
    });
    assert.match(
      projectStatus.localVerification.commands.at(-1).command,
      new RegExp(`--output ${escapeRegExp(projectStatusOutput)}`),
    );
    assert.match(
      projectStatus.localVerification.commands.at(-1).command,
      new RegExp(`--markdown-output ${escapeRegExp(projectStatusMarkdownOutput)}`),
    );
    assert.match(projectStatusMarkdown, /^# MVP Release Handoff/m);
    assert.match(
      projectStatusMarkdown,
      new RegExp(`Handoff JSON: \`${escapeRegExp(projectStatusOutput)}\``),
    );
    assert.match(
      projectStatusMarkdown,
      new RegExp(
        `Handoff Markdown: \`${escapeRegExp(projectStatusMarkdownOutput)}\``,
      ),
    );
    assert.equal(visualExportManifest.referenceCount, 12);
    assert.equal(visualExportManifest.missingCount, 12);
    assertReleaseRequestsManifestHandoff({
      releaseRequestsManifest, releaseRequestsManifestOutput,
      smokeInputsJsonOutput, smokeInputsManifest, visualExportManifest,
      projectStatusMarkdownOutput, projectStatusOutput, visualHandoffOutput,
      visualJsonOutput,
      visualManifestPath: manifestPath,
      visualMissingOutput, visualOutput, visualTableOutput,
    });
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
      /^name\tstatus\tvalue\tsource\trelease_evidence_required\tworkflow_required\tworkflow_description/m,
    );
    assert.equal(
      smokeInputsManifest.schemaVersion,
      "production-smoke-dispatch-inputs.v1",
    );
    assert.equal(smokeInputsManifest.status, "needs-inputs");
    assert.equal(smokeInputsManifest.inputCount, 7);
    assert.equal(smokeInputsManifest.missingInputCount, 7);
    assert.equal(smokeInputsManifest.inputs[0].releaseEvidenceRequired, true);
    assert.equal(smokeInputsManifest.inputs[0].source, "Page Builder Visual workflow artifact after visual evidence passes");
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
