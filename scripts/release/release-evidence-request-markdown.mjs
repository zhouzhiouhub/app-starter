import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createProductionSmokeRequestCommand } from "../smoke/production-smoke-dispatch-command.mjs";
import {
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
} from "../visual/page-builder-visual-reference-missing-output.mjs";
import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  defaultProductionSmokeDispatchInputsTableOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-table-path.mjs";
import {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-manifest-path.mjs";
import { createProductionSmokeRequestMarkdown } from "../smoke/production-smoke-request.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createPageBuilderVisualReferenceRequestCommand } from "../visual/page-builder-visual-reference-import-commands.mjs";
import {
  createPageBuilderVisualReferenceHandoffCommand,
  createPageBuilderVisualReferenceHandoffOutputPaths,
  defaultPageBuilderVisualReferenceHandoffOutputDir,
} from "../visual/page-builder-visual-reference-handoff.mjs";
import { createPageBuilderVisualReferenceRequestMarkdown } from "../visual/page-builder-visual-reference-request.mjs";
import { createReleaseEvidenceRequestCommand } from "./release-evidence-request-config.mjs";
import {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
} from "./release-requests-config.mjs";
import {
  defaultReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";
import {
  createReleaseProjectStatusHandoff,
} from "./release-project-status-handoff.mjs";

const maxMarkdownTextLength = 420;
const maxMarkdownCommandLength = 1200;

export async function writeReleaseEvidenceRequestMarkdown(outputPath, input) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createReleaseEvidenceRequestMarkdown(input),
    "utf8",
  );
}

export function createReleaseEvidenceRequestMarkdown(input) {
  const project = input.projectArtifact;
  const visual = input.visualReferenceArtifact;
  const smoke = input.smokeDispatchArtifact;
  const requestOutputPaths = input.requestOutputPaths ?? {};
  const smokeInputsOutputPath =
    input.smokeInputsOutputPath ??
    requestOutputPaths.productionSmokeInputs ??
    defaultProductionSmokeDispatchInputsOutputPath;
  const smokeInputsTableOutputPath =
    input.smokeInputsTableOutputPath ??
    requestOutputPaths.productionSmokeInputsTable ??
    defaultProductionSmokeDispatchInputsTableOutputPath;
  const smokeInputsJsonOutputPath =
    input.smokeInputsJsonOutputPath ??
    requestOutputPaths.productionSmokeInputsManifest ??
    defaultProductionSmokeDispatchInputsManifestOutputPath;
  const visualReferenceManifestOutputPath =
    requestOutputPaths.visualReferenceManifest ??
    visual.jsonOutputPath ??
    defaultPageBuilderVisualReferenceExportManifestOutputPath;
  const visualReferenceHandoffOutputDir =
    requestOutputPaths.visualReferenceHandoff ??
    defaultPageBuilderVisualReferenceHandoffOutputDir;
  const visualReferenceHandoffReadmePath =
    createPageBuilderVisualReferenceHandoffOutputPaths(
      visualReferenceHandoffOutputDir,
    ).readme;
  const releaseRequestsManifestOutputPath =
    requestOutputPaths.releaseRequestsManifest ??
    defaultReleaseRequestsManifestOutputPath;
  const projectStatusHandoff = createReleaseProjectStatusHandoff(
    project,
    requestOutputPaths,
  );
  const firstMissingVisualReference = Array.isArray(visual.missing)
    ? visual.missing[0]?.expectedPath
    : null;

  const lines = [
    "# MVP Release Evidence Request",
    "",
    `Generated at: ${formatCode(input.generatedAt)}`,
    `Project status: ${formatCode(project.status)}`,
    `Release ready: ${formatCode(project.releaseReady ? "yes" : "no")}`,
    `Release decision: ${formatCode(project.completionSummary.releaseDecision)}`,
    `Blockers: ${formatCode(project.releaseGate.blockerCount)}`,
    "",
    "## Evidence Requests",
    "",
    `- Refresh all requests: ${formatCode(
      createReleaseRequestsCommand(requestOutputPaths),
      maxMarkdownCommandLength,
    )}`,
    `- Request outputs: ${formatCode(
      createReleaseRequestsOutputSummary(input.requestOutputPaths),
      maxMarkdownCommandLength,
    )}`,
    `- Release requests manifest: ${formatCode(
      releaseRequestsManifestOutputPath,
    )}`,
    `- Project Status handoff: ${formatCode(
      projectStatusHandoff.command,
      maxMarkdownCommandLength,
    )}`,
    `- Project Status handoff JSON: ${formatCode(
      projectStatusHandoff.jsonPath,
    )}`,
    `- Project Status handoff Markdown: ${formatCode(
      projectStatusHandoff.markdownPath,
    )}`,
    `- Release evidence request: ${formatCode(
      createReleaseEvidenceRequestCommand(requestOutputPaths),
      maxMarkdownCommandLength,
    )}`,
    `- Page Builder design request: ${formatCode(
      createPageBuilderVisualReferenceRequestCommand(visual),
      maxMarkdownCommandLength,
    )}`,
    `- Page Builder reference export manifest: ${formatCode(
      visualReferenceManifestOutputPath,
    )}`,
    `- Page Builder design handoff package: ${formatCode(
      createPageBuilderVisualReferenceHandoffCommand({
        manifestPath: visual.manifestPath,
        outputDir: visualReferenceHandoffOutputDir,
        sourceDir: visual.sourceDir,
      }),
      maxMarkdownCommandLength,
    )}`,
    `- Page Builder design handoff output: ${formatCode(
      visualReferenceHandoffOutputDir,
    )}`,
    `- Page Builder design handoff README: ${formatCode(
      visualReferenceHandoffReadmePath,
    )}`,
    `- Production Smoke request: ${formatCode(
      createProductionSmokeRequestCommand({
        inputsJsonOutputPath: smokeInputsJsonOutputPath,
        inputsTableOutputPath: smokeInputsTableOutputPath,
        inputsOutputPath: smokeInputsOutputPath,
        outputPath: requestOutputPaths.productionSmoke,
      }),
      maxMarkdownCommandLength,
    )}`,
    `- Production Smoke dispatch inputs output: ${formatCode(
      smokeInputsOutputPath,
    )}`,
    `- Production Smoke dispatch inputs table output: ${formatCode(
      smokeInputsTableOutputPath,
    )}`,
    `- Production Smoke dispatch inputs JSON output: ${formatCode(
      smokeInputsJsonOutputPath,
    )}`,
    `- Completion gate: ${formatCode(
      "pnpm release:handoff -- --require-ready --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture",
    )}`,
    "",
    "## Blocking Evidence",
    "",
    ...formatBlockingChecklist(project.completionChecklist.items),
    "",
    "## Request Status",
    "",
    `- Visual references: ${formatCode(
      visual.status,
    )}; missing ${formatCode(visual.missingCount)}/${formatCode(
      visual.requiredReferenceCount,
    )}`,
    `- First missing visual reference: ${formatCode(
      firstMissingVisualReference ?? "none",
    )}`,
    `- Production Smoke dispatch ready: ${formatCode(
      smoke.readyToDispatch ? "yes" : "no",
    )}`,
    `- Missing Production Smoke inputs: ${formatCode(
      smoke.missingInputs.length > 0 ? smoke.missingInputs.join(", ") : "none",
    )}`,
    "",
    ...shiftMarkdownHeadings(
      createPageBuilderVisualReferenceRequestMarkdown(visual),
    ),
    "",
    ...shiftMarkdownHeadings(
      createProductionSmokeRequestMarkdown({
        ...smoke,
        inputsJsonOutputPath: smokeInputsJsonOutputPath,
        inputsTableOutputPath: smokeInputsTableOutputPath,
        inputsOutputPath: smokeInputsOutputPath,
      }),
    ),
    "",
    "## Final Review",
    "",
    "- Keep the generated request with the release ticket while evidence is blocked.",
    "- Do not mark the project complete from this request alone.",
    "- After real visual references and Production Smoke artifacts are retained, rerun `pnpm project:status -- --require-ready`.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function formatBlockingChecklist(items) {
  const blockingItems = items.filter((item) => item.status !== "complete");

  if (blockingItems.length === 0) {
    return ["- None"];
  }

  return blockingItems.map(
    (item) =>
      `- [ ] ${formatCode(item.label)}: ${formatText(
        item.evidence ?? item.nextAction,
      )}`,
  );
}

function shiftMarkdownHeadings(markdown) {
  return markdown
    .trimEnd()
    .split("\n")
    .map((line) => {
      const match = /^(#{1,5})(\s.*)$/u.exec(line);
      return match ? `${match[1]}#${match[2]}` : line;
    });
}

function formatCode(value, maxLength = maxMarkdownTextLength) {
  return `\`${formatText(value, maxLength).replaceAll("`", "'")}\``;
}

function formatText(value, maxLength = maxMarkdownTextLength) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength,
  });
}
