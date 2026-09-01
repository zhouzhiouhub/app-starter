import {
  defaultProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config.mjs";

export const defaultReleaseRequestsOutputPaths = {
  productionSmokeInputs: defaultProductionSmokeDispatchInputsOutputPath,
  productionSmoke: defaultProductionSmokeRequestOutputPath,
  releaseEvidence: defaultReleaseEvidenceRequestOutputPath,
  visualMissingReferences: defaultPageBuilderVisualMissingReferencesOutputPath,
  visualReference: defaultPageBuilderVisualReferenceRequestOutputPath,
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
    "--smoke-output",
    paths.productionSmoke,
    "--smoke-inputs-output",
    paths.productionSmokeInputs,
  ].join(" ");
}

export function createReleaseRequestsOutputSummary(outputPaths = {}) {
  const paths = createReleaseRequestsOutputPaths(outputPaths);

  return [
    paths.releaseEvidence,
    paths.visualReference,
    paths.visualMissingReferences,
    paths.productionSmoke,
    paths.productionSmokeInputs,
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
