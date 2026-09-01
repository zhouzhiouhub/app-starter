import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  defaultProductionSmokeDispatchInputsTableOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-table-path.mjs";
import {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-manifest-path.mjs";
import {
  defaultProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import {
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  defaultPageBuilderVisualReferenceHandoffOutputDir,
} from "../visual/page-builder-visual-reference-handoff.mjs";

export const defaultReleaseEvidenceRequestOutputPath =
  "artifacts/release/release-evidence-request.md";
export const defaultReleaseEvidenceRequestOutputPaths = {
  productionSmoke: defaultProductionSmokeRequestOutputPath,
  productionSmokeInputs: defaultProductionSmokeDispatchInputsOutputPath,
  productionSmokeInputsManifest:
    defaultProductionSmokeDispatchInputsManifestOutputPath,
  productionSmokeInputsTable: defaultProductionSmokeDispatchInputsTableOutputPath,
  releaseEvidence: defaultReleaseEvidenceRequestOutputPath,
  visualReferenceHandoff: defaultPageBuilderVisualReferenceHandoffOutputDir,
  visualMissingReferences: defaultPageBuilderVisualMissingReferencesOutputPath,
  visualReference: defaultPageBuilderVisualReferenceRequestOutputPath,
  visualReferenceManifest: defaultPageBuilderVisualReferenceExportManifestOutputPath,
  visualReferenceTable: defaultPageBuilderVisualReferenceExportTableOutputPath,
};

const defaultReleaseEvidenceRequestCommand = "pnpm release:evidence-request";

export function createReleaseEvidenceRequestCommand(outputPaths = {}) {
  const paths = createReleaseEvidenceRequestOutputPaths(outputPaths);

  if (isDefaultReleaseEvidenceRequestOutputPaths(paths)) {
    return defaultReleaseEvidenceRequestCommand;
  }

  return [
    defaultReleaseEvidenceRequestCommand,
    "--",
    "--output",
    paths.releaseEvidence,
    "--visual-output",
    paths.visualReference,
    "--visual-missing-output",
    paths.visualMissingReferences,
    "--visual-table-output",
    paths.visualReferenceTable,
    "--visual-json-output",
    paths.visualReferenceManifest,
    "--visual-handoff-output",
    paths.visualReferenceHandoff,
    "--smoke-output",
    paths.productionSmoke,
    "--smoke-inputs-output",
    paths.productionSmokeInputs,
    "--smoke-inputs-table-output",
    paths.productionSmokeInputsTable,
    "--smoke-inputs-json-output",
    paths.productionSmokeInputsManifest,
  ].join(" ");
}

export function createReleaseEvidenceRequestOutputPaths(outputPaths) {
  return {
    ...defaultReleaseEvidenceRequestOutputPaths,
    ...outputPaths,
  };
}

function isDefaultReleaseEvidenceRequestOutputPaths(paths) {
  return Object.entries(defaultReleaseEvidenceRequestOutputPaths).every(
    ([key, value]) => paths[key] === value,
  );
}
