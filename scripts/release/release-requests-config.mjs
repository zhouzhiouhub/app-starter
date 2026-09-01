import {
  defaultProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  defaultProductionSmokeDispatchInputsTableOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-table-path.mjs";
import {
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config.mjs";

export const defaultReleaseRequestsOutputPaths = {
  productionSmokeInputs: defaultProductionSmokeDispatchInputsOutputPath,
  productionSmokeInputsTable: defaultProductionSmokeDispatchInputsTableOutputPath,
  productionSmoke: defaultProductionSmokeRequestOutputPath,
  releaseEvidence: defaultReleaseEvidenceRequestOutputPath,
  visualMissingReferences: defaultPageBuilderVisualMissingReferencesOutputPath,
  visualReference: defaultPageBuilderVisualReferenceRequestOutputPath,
  visualReferenceManifest: defaultPageBuilderVisualReferenceExportManifestOutputPath,
  visualReferenceTable: defaultPageBuilderVisualReferenceExportTableOutputPath,
};

const releaseRequestsCommand = "pnpm release:requests";

export function createReleaseRequestsCommand(outputPaths = {}) {
  const paths = createReleaseRequestsOutputPaths(outputPaths);

  if (isDefaultReleaseRequestsOutputPaths(paths)) {
    return releaseRequestsCommand;
  }

  return [
    releaseRequestsCommand,
    "--",
    "--release-output",
    paths.releaseEvidence,
    "--visual-output",
    paths.visualReference,
    "--visual-missing-output",
    paths.visualMissingReferences,
    "--visual-table-output",
    paths.visualReferenceTable,
    "--visual-json-output",
    paths.visualReferenceManifest,
    "--smoke-output",
    paths.productionSmoke,
    "--smoke-inputs-output",
    paths.productionSmokeInputs,
    "--smoke-inputs-table-output",
    paths.productionSmokeInputsTable,
  ].join(" ");
}

export function createReleaseRequestsOutputSummary(outputPaths = {}) {
  const paths = createReleaseRequestsOutputPaths(outputPaths);

  return [
    paths.releaseEvidence,
    paths.visualReference,
    paths.visualMissingReferences,
    paths.visualReferenceTable,
    paths.visualReferenceManifest,
    paths.productionSmoke,
    paths.productionSmokeInputs,
    paths.productionSmokeInputsTable,
  ].join(", ");
}

function createReleaseRequestsOutputPaths(outputPaths) {
  return {
    ...defaultReleaseRequestsOutputPaths,
    ...outputPaths,
  };
}

function isDefaultReleaseRequestsOutputPaths(paths) {
  return Object.entries(defaultReleaseRequestsOutputPaths).every(
    ([key, value]) => paths[key] === value,
  );
}
