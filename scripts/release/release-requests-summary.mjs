import {
  createPageBuilderVisualReferenceHandoffOutputPaths,
} from "../visual/page-builder-visual-reference-handoff.mjs";
import {
  formatPageBuilderVisualMeasurementSummary,
} from "../visual/page-builder-visual-measurement-summary.mjs";

export function printReleaseRequestsManifestSummary(manifest, writeLine) {
  const completion = manifest.projectCompletion;
  const checklist = completion.completionChecklist;
  const nextAction = completion.nextActionPreview[0] ?? null;

  writeLine(
    `Project completion: ${completion.status} (${checklist.completeCount}/${checklist.itemCount} complete, ${checklist.needsEvidenceCount} need evidence)`,
  );
  writeLine(
    `Release decision: ${completion.releaseDecision}; release evidence: ${completion.releaseEvidenceStatus}`,
  );
  writeLine(
    `Next action preview: ${completion.nextActionPreviewCount}/${completion.nextActionCount}`,
  );
  if (completion.projectStatusHandoff?.markdownPath) {
    writeLine(
      `Project status handoff: ${completion.projectStatusHandoff.markdownPath}`,
    );
  }
  printVisualMeasurementSummary(manifest.pageBuilderVisual, writeLine);
  printFirstMissingVisualReference(manifest.pageBuilderVisual, writeLine);
  printFirstMissingVisualReason(manifest.pageBuilderVisual, writeLine);
  printFirstMissingVisualPreview(manifest.pageBuilderVisual, writeLine);
  printFirstMissingSmokeInput(manifest.productionSmoke, writeLine);

  if (nextAction) {
    writeLine(`  - ${nextAction.area}: ${nextAction.label}`);
    printFirstStep(nextAction, writeLine);
  }
}

function printVisualMeasurementSummary(visual, writeLine) {
  const summary = formatPageBuilderVisualMeasurementSummary(visual);

  if (summary) {
    writeLine(`Visual measurements: ${summary}`);
  }
}

function printFirstMissingVisualReference(visual, writeLine) {
  const expectedPath =
    readNonEmptyString(visual?.firstMissingReference) ??
    readNonEmptyString(visual?.missingReferences?.[0]);

  if (expectedPath) {
    writeLine(`First missing visual reference: ${expectedPath}`);
  }
}

function printFirstMissingVisualReason(visual, writeLine) {
  const reason = readNonEmptyString(visual?.firstMissingReferenceReason);

  if (reason) {
    writeLine(`First missing visual reason: ${reason}`);
  }
}

function printFirstMissingVisualPreview(visual, writeLine) {
  const previewSummary = readNonEmptyString(
    visual?.firstMissingReferencePreview,
  );

  if (previewSummary) {
    writeLine(`First missing visual preview: ${previewSummary}`);
  }
}

function printFirstMissingSmokeInput(smoke, writeLine) {
  const input = Array.isArray(smoke?.inputs)
    ? smoke.inputs.find((item) => item?.status === "missing")
    : null;

  if (!input) {
    return;
  }

  const reason =
    typeof input.missingReason === "string" && input.missingReason.length > 0
      ? ` - ${input.missingReason}`
      : "";

  writeLine(`First missing Production Smoke input: ${input.name}${reason}`);
}

function readNonEmptyString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function printReleaseRequestFiles(outputPaths, writeLine) {
  writeLine("Release request files refreshed:");
  writeLine(`  - Release evidence: ${outputPaths.releaseEvidence}`);
  writeLine(
    `  - Release requests manifest: ${outputPaths.releaseRequestsManifest}`,
  );
  writeLine(`  - Project status JSON: ${outputPaths.projectStatus}`);
  writeLine(
    `  - Project status Markdown: ${outputPaths.projectStatusMarkdown}`,
  );
  writeLine(`  - Page Builder design: ${outputPaths.visualReference}`);
  writeLine(
    `  - Page Builder missing paths: ${outputPaths.visualMissingReferences}`,
  );
  writeLine(`  - Page Builder export table: ${outputPaths.visualReferenceTable}`);
  writeLine(
    `  - Page Builder export manifest: ${outputPaths.visualReferenceManifest}`,
  );
  writeLine(
    `  - Page Builder handoff package: ${outputPaths.visualReferenceHandoff}`,
  );
  writeLine(
    `  - Page Builder handoff README: ${
      createPageBuilderVisualReferenceHandoffOutputPaths(
        outputPaths.visualReferenceHandoff,
      ).readme
    }`,
  );
  writeLine(`  - Production Smoke: ${outputPaths.productionSmoke}`);
  writeLine(`  - Production Smoke inputs: ${outputPaths.productionSmokeInputs}`);
  writeLine(
    `  - Production Smoke inputs table: ${outputPaths.productionSmokeInputsTable}`,
  );
  writeLine(
    `  - Production Smoke inputs JSON: ${outputPaths.productionSmokeInputsManifest}`,
  );
}

function printFirstStep(nextAction, writeLine) {
  if (!nextAction.firstStep) {
    return;
  }

  writeLine(
    `    First step: ${nextAction.firstStep.label}: ${nextAction.firstStep.value}`,
  );
}
