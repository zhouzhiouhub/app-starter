import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createProductionSmokeDispatchInputsManifest,
} from "../smoke/production-smoke-dispatch-inputs-manifest-output.mjs";
import {
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceCheckCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
  createPageBuilderVisualReferenceMissingPathsCommand,
  createPageBuilderVisualReferenceRequestCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";
import {
  createPageBuilderVisualReferenceHandoffCommand,
} from "../visual/page-builder-visual-reference-handoff-paths.mjs";
import {
  normalizeReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";
import {
  releaseRequestsManifestSchemaVersion,
} from "./release-requests-manifest-schema.mjs";
import {
  assertReleaseRequestsManifest,
} from "./release-requests-manifest-validation.mjs";

export {
  defaultReleaseRequestsManifestOutputPath,
  normalizeReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";
export {
  releaseRequestsManifestSchemaVersion,
} from "./release-requests-manifest-schema.mjs";

export function createReleaseRequestsManifest(input = {}) {
  const request = input.releaseEvidenceRequest ?? {};
  const outputPaths = input.outputPaths ?? {};
  const project = request.projectArtifact ?? {};
  const visual = request.visualReferenceArtifact ?? {};
  const smoke = request.smokeDispatchArtifact ?? {};
  const smokeInputsManifest = createProductionSmokeDispatchInputsManifest({
    ...smoke,
    inputsJsonOutputPath: outputPaths.productionSmokeInputsManifest,
  });
  const missingInputs = smokeInputsManifest.missingInputs;
  const missingReferences = Array.isArray(visual.missing) ? visual.missing : [];
  const missingReferencePaths = missingReferences
    .map((reference) => reference?.expectedPath)
    .filter(
      (expectedPath) =>
        typeof expectedPath === "string" && expectedPath.length > 0,
    );
  const visualCommandContext = createVisualCommandContext({
    outputPaths,
    visual,
  });

  return {
    command: input.command ?? "",
    generatedAt: request.generatedAt ?? input.generatedAt ?? "",
    outputPaths,
    pageBuilderVisual: {
      commands: createVisualCommands(visualCommandContext),
      firstMissingReference: missingReferencePaths[0] ?? null,
      missingCount: readNumber(visual.missingCount),
      missingReferences: missingReferencePaths,
      referenceExportManifestPath: outputPaths.visualReferenceManifest ?? null,
      referenceExportTablePath: outputPaths.visualReferenceTable ?? null,
      referenceHandoffOutputDir: outputPaths.visualReferenceHandoff ?? null,
      referenceRequestPath: outputPaths.visualReference ?? null,
      requiredReferenceCount: readNumber(visual.requiredReferenceCount),
      status: visual.status ?? "unknown",
    },
    projectCompletion: createProjectCompletionSummary(project),
    productionSmoke: {
      dispatchManifestContext: smokeInputsManifest.dispatchManifestContext,
      dispatchCommand: smokeInputsManifest.command,
      inputCount: smokeInputsManifest.inputCount,
      inputSources: smokeInputsManifest.inputSources,
      inputs: smokeInputsManifest.inputs,
      inputsManifestPath: outputPaths.productionSmokeInputsManifest ?? null,
      inputsOutputPath: outputPaths.productionSmokeInputs ?? null,
      inputsTablePath: outputPaths.productionSmokeInputsTable ?? null,
      missingInputCount: missingInputs.length,
      missingInputs,
      readyToDispatch: smoke.readyToDispatch === true,
      requestPath: outputPaths.productionSmoke ?? null,
      requiredEvidence: smokeInputsManifest.requiredEvidence,
      ref: smokeInputsManifest.ref,
      validationCommand: smokeInputsManifest.validationCommand,
      workflowFile: smokeInputsManifest.workflowFile,
      workflowInputs: smokeInputsManifest.workflowInputs,
    },
    releaseEvidence: {
      blockerCount: readNumber(project.releaseGate?.blockerCount),
      decision: project.completionSummary?.releaseDecision ?? "unknown",
      ready: project.releaseReady === true,
      requestPath: outputPaths.releaseEvidence ?? null,
      status: project.status ?? "unknown",
    },
    schemaVersion: releaseRequestsManifestSchemaVersion,
    status: project.releaseReady === true ? "ready" : "needs-evidence",
  };
}

export async function writeReleaseRequestsManifest(outputPath, input) {
  const normalizedOutputPath =
    normalizeReleaseRequestsManifestOutputPath(outputPath);
  const manifest = createReleaseRequestsManifest(input);

  assertReleaseRequestsManifest(manifest);
  await mkdir(dirname(normalizedOutputPath), { recursive: true });
  await writeFile(
    normalizedOutputPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return normalizedOutputPath;
}

function readNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function readString(value, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readStringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.length > 0)
    : [];
}

function createProjectCompletionSummary(project) {
  const nextActions = Array.isArray(project.nextActions)
    ? project.nextActions
    : [];
  const nextActionPreview = nextActions.slice(0, 3).map(readNextActionPreview);

  return {
    completedMilestoneCount: readStringList(project.completedMilestones).length,
    completionChecklist: readCompletionChecklist(project.completionChecklist),
    localMvpScope: readString(project.completionSummary?.localMvpScope, "unknown"),
    nextActionCount: readNumber(project.nextActionCount),
    nextActionPreview,
    nextActionPreviewCount: nextActionPreview.length,
    phase: readString(project.phase, "unknown"),
    releaseDecision: readString(
      project.completionSummary?.releaseDecision,
      "unknown",
    ),
    releaseEvidenceStatus: readString(
      project.completionSummary?.releaseEvidenceStatus,
      "unknown",
    ),
    releaseReady: project.releaseReady === true,
    status: readString(project.status, "unknown"),
    summary: readString(project.completionSummary?.summary),
    truncatedNextActionCount: readNumber(project.truncatedNextActionCount),
  };
}

function readCompletionChecklist(checklist) {
  const items = Array.isArray(checklist?.items)
    ? checklist.items.map(readCompletionChecklistItem)
    : [];

  return {
    completeCount: readNumber(checklist?.completeCount),
    itemCount: readNumber(checklist?.itemCount),
    items,
    needsEvidenceCount: readNumber(checklist?.needsEvidenceCount),
  };
}

function readCompletionChecklistItem(item) {
  return {
    evidence: readString(item?.evidence),
    label: readString(item?.label, "unknown"),
    nextAction:
      typeof item?.nextAction === "string" && item.nextAction.length > 0
        ? item.nextAction
        : null,
    status: readString(item?.status, "unknown"),
  };
}

function readNextActionPreview(action) {
  const steps = Array.isArray(action?.steps) ? action.steps : [];

  return {
    action: readString(action?.action),
    area: readString(action?.area, "unknown"),
    firstStep: steps.length > 0 ? readNextActionStep(steps[0]) : null,
    label: readString(action?.label, "unknown"),
    stepCount: steps.length,
  };
}

function readNextActionStep(step) {
  return {
    label: readString(step?.label, "unknown"),
    value: readString(step?.value),
  };
}

function createVisualCommandContext(input) {
  return {
    jsonOutputPath: input.outputPaths.visualReferenceManifest,
    manifestPath: input.visual.manifestPath,
    missingOutputPath: input.outputPaths.visualMissingReferences,
    outputDir: input.outputPaths.visualReferenceHandoff,
    requestOutputPath: input.outputPaths.visualReference,
    sourceDir: input.visual.sourceDir,
    tableOutputPath: input.outputPaths.visualReferenceTable,
  };
}

function createVisualCommands(context) {
  return {
    acceptPassing: createPageBuilderVisualReferenceAcceptPassingCommand(context),
    captureFixture: createPageBuilderVisualReferenceCaptureCommand(context),
    handoff: createPageBuilderVisualReferenceHandoffCommand(context),
    importReferences: createPageBuilderVisualReferenceImportWriteCommand(context),
    measure: createPageBuilderVisualReferenceMeasureCommand(context),
    missingPaths: createPageBuilderVisualReferenceMissingPathsCommand(context),
    referenceReport: createPageBuilderVisualReferenceCheckCommand(context),
    request: createPageBuilderVisualReferenceRequestCommand(context),
    verifyAccepted: createPageBuilderVisualReferenceAcceptanceCommand(context),
  };
}
