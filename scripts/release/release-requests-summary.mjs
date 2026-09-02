import {
  createPageBuilderVisualReferenceHandoffOutputPaths,
} from "../visual/page-builder-visual-reference-handoff.mjs";

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

  if (nextAction) {
    writeLine(`  - ${nextAction.area}: ${nextAction.label}`);
    printFirstStep(nextAction, writeLine);
  }
}

export function printReleaseRequestFiles(outputPaths, writeLine) {
  writeLine("Release request files refreshed:");
  writeLine(`  - Release evidence: ${outputPaths.releaseEvidence}`);
  writeLine(
    `  - Release requests manifest: ${outputPaths.releaseRequestsManifest}`,
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
