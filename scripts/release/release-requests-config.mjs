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
  defaultProductionSmokeDispatchInputsManifestOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-manifest-path.mjs";
import {
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  createPageBuilderVisualReferenceHandoffOutputPaths,
  defaultPageBuilderVisualReferenceHandoffOutputDir,
} from "../visual/page-builder-visual-reference-handoff.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config.mjs";
import {
  defaultReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";
import {
  defaultReleaseProjectStatusMarkdownPath,
  defaultReleaseProjectStatusOutputPath,
} from "./release-project-status-handoff.mjs";

export const defaultReleaseRequestsOutputPaths = {
  productionSmokeInputs: defaultProductionSmokeDispatchInputsOutputPath,
  productionSmokeInputsManifest:
    defaultProductionSmokeDispatchInputsManifestOutputPath,
  productionSmokeInputsTable: defaultProductionSmokeDispatchInputsTableOutputPath,
  productionSmoke: defaultProductionSmokeRequestOutputPath,
  projectStatus: defaultReleaseProjectStatusOutputPath,
  projectStatusMarkdown: defaultReleaseProjectStatusMarkdownPath,
  releaseEvidence: defaultReleaseEvidenceRequestOutputPath,
  releaseRequestsManifest: defaultReleaseRequestsManifestOutputPath,
  visualReferenceHandoff: defaultPageBuilderVisualReferenceHandoffOutputDir,
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
    "--requests-manifest-output",
    paths.releaseRequestsManifest,
    "--project-status-output",
    paths.projectStatus,
    "--project-status-markdown",
    paths.projectStatusMarkdown,
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

export function createReleaseRequestsOutputSummary(outputPaths = {}) {
  const paths = createReleaseRequestsOutputPaths(outputPaths);

  return [
    paths.releaseEvidence,
    paths.releaseRequestsManifest,
    paths.projectStatus,
    paths.projectStatusMarkdown,
    paths.visualReference,
    paths.visualMissingReferences,
    paths.visualReferenceTable,
    paths.visualReferenceManifest,
    paths.visualReferenceHandoff,
    createPageBuilderVisualReferenceHandoffOutputPaths(
      paths.visualReferenceHandoff,
    ).readme,
    paths.productionSmoke,
    paths.productionSmokeInputs,
    paths.productionSmokeInputsTable,
    paths.productionSmokeInputsManifest,
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
