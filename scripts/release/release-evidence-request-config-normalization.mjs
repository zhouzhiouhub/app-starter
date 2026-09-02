import { readProductionSmokeDispatchCliConfig } from "../smoke/production-smoke-dispatch-cli.mjs";
import {
  normalizeProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  normalizeProductionSmokeDispatchInputsTableOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-table-path.mjs";
import {
  normalizeProductionSmokeDispatchInputsManifestOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-manifest-path.mjs";
import {
  normalizeProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import {
  normalizeVisualReferenceImportMarkdownOutputPath,
  normalizeVisualReferenceSourceDir,
} from "../visual/page-builder-visual-reference-import-config.mjs";
import {
  normalizeVisualReferenceExportManifestOutputPath,
  normalizeVisualReferenceExportTableOutputPath,
  normalizeVisualReferenceMissingOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  normalizeVisualReferenceHandoffOutputDir,
} from "../visual/page-builder-visual-reference-handoff.mjs";
import { readReleaseCheckCliConfig } from "./release-check-config.mjs";
import {
  normalizeReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";
import { normalizeReleaseCheckMarkdownPath } from "./release-notes-validation.mjs";

export function createReleaseEvidenceRequestResolvedConfig(input) {
  const releaseCheckConfig = readReleaseCheckCliConfig(input.releaseCheckArgs);
  const outputPath = normalizeReleaseEvidenceRequestOutputPath(input.outputPath);
  const smokeInputsOutputPath =
    normalizeProductionSmokeDispatchInputsOutputPath(input.smokeInputsOutputPath);
  const smokeInputsTableOutputPath =
    normalizeProductionSmokeDispatchInputsTableOutputPath(
      input.smokeInputsTableOutputPath,
    );
  const smokeInputsJsonOutputPath =
    normalizeProductionSmokeDispatchInputsManifestOutputPath(
      input.smokeInputsJsonOutputPath,
    );

  return {
    outputPath,
    releaseCheckConfig,
    requestOutputPaths: createRequestOutputPaths(input, {
      outputPath,
      smokeInputsJsonOutputPath,
      smokeInputsOutputPath,
      smokeInputsTableOutputPath,
    }),
    smokeDispatchConfig: readProductionSmokeDispatchCliConfig(
      input.smokeDispatchArgs,
    ),
    smokeInputsJsonOutputPath,
    smokeInputsOutputPath,
    smokeInputsTableOutputPath,
    visualManifestPath:
      releaseCheckConfig.visualArtifactDir
        ? releaseCheckConfig.visualManifestPath
        : input.visualManifestPath,
    visualSourceDir: normalizeVisualReferenceSourceDir(input.visualSourceDir),
  };
}

export function normalizeReleaseEvidenceRequestOutputPath(value) {
  try {
    return normalizeReleaseCheckMarkdownPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Release check Markdown",
        "Release evidence request",
      ),
    );
  }
}

function createRequestOutputPaths(input, resolved) {
  return {
    productionSmoke: normalizeProductionSmokeRequestOutputPath(
      input.requestOutputPaths.productionSmoke,
    ),
    productionSmokeInputs: resolved.smokeInputsOutputPath,
    productionSmokeInputsManifest: resolved.smokeInputsJsonOutputPath,
    productionSmokeInputsTable: resolved.smokeInputsTableOutputPath,
    releaseEvidence: resolved.outputPath,
    releaseRequestsManifest: normalizeReleaseRequestsManifestOutputPath(
      input.requestOutputPaths.releaseRequestsManifest,
    ),
    visualMissingReferences: normalizeVisualReferenceMissingOutputPath(
      input.requestOutputPaths.visualMissingReferences,
    ),
    visualReference: normalizeVisualReferenceImportMarkdownOutputPath(
      input.requestOutputPaths.visualReference,
    ),
    visualReferenceHandoff: normalizeVisualReferenceHandoffOutputDir(
      input.requestOutputPaths.visualReferenceHandoff,
    ),
    visualReferenceManifest: normalizeVisualReferenceExportManifestOutputPath(
      input.requestOutputPaths.visualReferenceManifest,
    ),
    visualReferenceTable: normalizeVisualReferenceExportTableOutputPath(
      input.requestOutputPaths.visualReferenceTable,
    ),
  };
}
