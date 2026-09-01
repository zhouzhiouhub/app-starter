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
  createReleaseEvidenceRequestCommand,
  defaultReleaseEvidenceRequestOutputPath,
} from "../release/release-evidence-request-config.mjs";
import {
  createPageBuilderVisualReferenceRequestCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";
import {
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
} from "../release/release-requests-config.mjs";

const defaultVisualArtifactDir = "reports/visual/page-builder-fixture";
const defaultVisualReferenceSourceDir = "docs/visual/page-builder-references";

export function createReleaseEvidenceRequestAction() {
  return {
    action:
      "Run pnpm release:requests to refresh the blocked release evidence, design reference, and Production Smoke request handoffs.",
    area: "Release Evidence",
    label: "Refresh evidence requests",
    steps: [
      createReleaseEvidenceStep(
        "Refresh requests",
        createReleaseRequestsCommand(),
      ),
      createReleaseEvidenceStep(
        "Refresh requests output",
        createReleaseRequestsOutputSummary(),
      ),
      createReleaseEvidenceStep(
        "Evidence request",
        createReleaseEvidenceRequestCommand(),
      ),
      createReleaseEvidenceStep(
        "Evidence request output",
        defaultReleaseEvidenceRequestOutputPath,
      ),
      createReleaseEvidenceStep(
        "Design request",
        createPageBuilderVisualReferenceRequestCommand({
          manifestPath: `${defaultVisualArtifactDir}/page-builder-visual-acceptance.json`,
          sourceDir: defaultVisualReferenceSourceDir,
        }),
      ),
      createReleaseEvidenceStep(
        "Design request output",
        defaultPageBuilderVisualReferenceRequestOutputPath,
      ),
      createReleaseEvidenceStep(
        "Export table output",
        defaultPageBuilderVisualReferenceExportTableOutputPath,
      ),
      createReleaseEvidenceStep(
        "Export manifest output",
        defaultPageBuilderVisualReferenceExportManifestOutputPath,
      ),
      createReleaseEvidenceStep("Smoke request", "pnpm smoke:request"),
      createReleaseEvidenceStep(
        "Smoke request output",
        defaultProductionSmokeRequestOutputPath,
      ),
      createReleaseEvidenceStep(
        "Dispatch inputs output",
        defaultProductionSmokeDispatchInputsOutputPath,
      ),
      createReleaseEvidenceStep(
        "Dispatch inputs table output",
        defaultProductionSmokeDispatchInputsTableOutputPath,
      ),
      createReleaseEvidenceStep(
        "Final gate",
        "pnpm release:handoff -- --require-ready --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture",
      ),
    ],
  };
}

function createReleaseEvidenceStep(label, value) {
  return { label, value };
}
