import {
  defaultProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import {
  createReleaseEvidenceRequestCommand,
  defaultReleaseEvidenceRequestOutputPath,
} from "../release/release-evidence-request-config.mjs";
import {
  createPageBuilderVisualReferenceRequestCommand,
} from "../visual/page-builder-visual-reference-import-commands.mjs";
import {
  defaultPageBuilderVisualReferenceRequestOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
} from "../release/release-requests.mjs";

const defaultVisualArtifactDir = "reports/visual/page-builder-fixture";
const defaultVisualReferenceSourceDir = "docs/visual/page-builder-references";

export function createReleaseEvidenceRequestAction() {
  return {
    action:
      "Run pnpm release:evidence-request to create one handoff for blocked release evidence, design references, Production Smoke inputs, retained artifacts, and the final ready gate.",
    area: "Release Evidence",
    label: "Generate evidence request",
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
      createReleaseEvidenceStep("Smoke request", "pnpm smoke:request"),
      createReleaseEvidenceStep(
        "Smoke request output",
        defaultProductionSmokeRequestOutputPath,
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
