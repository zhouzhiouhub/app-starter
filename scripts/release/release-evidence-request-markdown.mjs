import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createProductionSmokeRequestCommand } from "../smoke/production-smoke-dispatch-command.mjs";
import { createProductionSmokeRequestMarkdown } from "../smoke/production-smoke-request.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createPageBuilderVisualReferenceRequestCommand } from "../visual/page-builder-visual-reference-import-commands.mjs";
import { createPageBuilderVisualReferenceRequestMarkdown } from "../visual/page-builder-visual-reference-request.mjs";
import { createReleaseEvidenceRequestCommand } from "./release-evidence-request-config.mjs";

const maxMarkdownTextLength = 420;

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
    `- Release evidence request: ${formatCode(createReleaseEvidenceRequestCommand())}`,
    `- Page Builder design request: ${formatCode(
      createPageBuilderVisualReferenceRequestCommand(visual),
    )}`,
    `- Production Smoke request: ${formatCode(createProductionSmokeRequestCommand())}`,
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
    ...shiftMarkdownHeadings(createProductionSmokeRequestMarkdown(smoke)),
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

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
