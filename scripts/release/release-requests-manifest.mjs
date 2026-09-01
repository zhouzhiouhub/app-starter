import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createProductionSmokeDispatchManifestValidationCommand,
} from "../smoke/production-smoke-dispatch-command.mjs";
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

export const releaseRequestsManifestSchemaVersion =
  "release-requests-manifest.v1";
export {
  defaultReleaseRequestsManifestOutputPath,
  normalizeReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";

export function createReleaseRequestsManifest(input = {}) {
  const request = input.releaseEvidenceRequest ?? {};
  const outputPaths = input.outputPaths ?? {};
  const project = request.projectArtifact ?? {};
  const visual = request.visualReferenceArtifact ?? {};
  const smoke = request.smokeDispatchArtifact ?? {};
  const missingInputs = Array.isArray(smoke.missingInputs)
    ? smoke.missingInputs
    : [];
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
    productionSmoke: {
      dispatchCommand: smoke.command ?? "",
      inputCount: Array.isArray(smoke.inputs) ? smoke.inputs.length : 0,
      inputsManifestPath: outputPaths.productionSmokeInputsManifest ?? null,
      inputsOutputPath: outputPaths.productionSmokeInputs ?? null,
      inputsTablePath: outputPaths.productionSmokeInputsTable ?? null,
      missingInputCount: missingInputs.length,
      missingInputs,
      readyToDispatch: smoke.readyToDispatch === true,
      requestPath: outputPaths.productionSmoke ?? null,
      validationCommand: createProductionSmokeDispatchManifestValidationCommand({
        inputsJsonPath: outputPaths.productionSmokeInputsManifest,
      }),
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

  await mkdir(dirname(normalizedOutputPath), { recursive: true });
  await writeFile(
    normalizedOutputPath,
    `${JSON.stringify(createReleaseRequestsManifest(input), null, 2)}\n`,
    "utf8",
  );

  return normalizedOutputPath;
}

function readNumber(value) {
  return Number.isFinite(value) ? value : 0;
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
