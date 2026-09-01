import {
  defaultProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import {
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config.mjs";

export const defaultReleaseRequestsOutputPaths = {
  productionSmoke: defaultProductionSmokeRequestOutputPath,
  releaseEvidence: defaultReleaseEvidenceRequestOutputPath,
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
    defaultReleaseRequestsOutputPaths.productionSmoke,
  ].join(", ");
}
