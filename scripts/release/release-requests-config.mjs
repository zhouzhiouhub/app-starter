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

export function createReleaseRequestsCommand() {
  return releaseRequestsCommand;
}

export function createReleaseRequestsOutputSummary() {
  return [
    defaultReleaseRequestsOutputPaths.releaseEvidence,
    defaultReleaseRequestsOutputPaths.visualReference,
    defaultReleaseRequestsOutputPaths.visualMissingReferences,
    defaultReleaseRequestsOutputPaths.productionSmoke,
    defaultReleaseRequestsOutputPaths.productionSmokeInputs,
  ].join(", ");
}
