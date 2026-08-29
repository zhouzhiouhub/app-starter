import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
} from "./page-builder-visual-reference-import-commands.mjs";

const maxMarkdownTextLength = 420;

export function createPageBuilderVisualReferenceImportMarkdown(report) {
  const lines = [
    "# Page Builder Visual Reference Import",
    "",
    `Status: ${formatCode(report.status)}`,
    `Manifest: ${formatCode(report.manifestPath)}`,
    `Source dir: ${formatCode(report.sourceDir)}`,
    `References updated: ${report.updates.length}`,
    `Missing references: ${report.missing.length}`,
    "",
    "## Updates",
    "",
    ...formatUpdates(report.updates),
    "",
    "## Missing References",
    "",
    ...formatMissingReferences(report),
    "",
    "## Next Step",
    "",
    ...formatNextStep(report),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writePageBuilderVisualReferenceImportMarkdown(
  outputPath,
  report,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createPageBuilderVisualReferenceImportMarkdown(report),
    "utf8",
  );
}

function formatUpdates(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return ["- None"];
  }

  return updates.map(
    (update) =>
      `- ${formatText(update.component)}.${formatText(
        update.viewport,
      )}: ${formatCode(update.designReference)}`,
  );
}

function formatMissingReferences(report) {
  if (!Array.isArray(report.missing) || report.missing.length === 0) {
    return ["- None"];
  }

  return report.missing.map(
    (missing) =>
      `- ${formatText(missing.component)}.${formatText(
        missing.viewport,
      )}: ${formatText(missing.reason)}; expected ${formatCode(
        createExpectedReferencePath(report.sourceDir, missing),
      )}`,
  );
}

function formatNextStep(report) {
  if (report.status === "ready") {
    return [
      `- Run ${formatCode(
        createPageBuilderVisualReferenceCaptureCommand(report),
      )} if the retained browser screenshots are stale.`,
      `- Run ${formatCode(
        createPageBuilderVisualReferenceMeasureCommand(report),
      )} after fixture screenshots are attached.`,
      `- When review passes, run ${formatCode(
        createPageBuilderVisualReferenceAcceptPassingCommand(report),
      )}.`,
    ];
  }

  if (report.status === "updated") {
    return [
      `- Run ${formatCode(
        createPageBuilderVisualReferenceCaptureCommand(report),
      )}.`,
      `- Run ${formatCode(createPageBuilderVisualReferenceMeasureCommand(report))}.`,
      `- Review the measured diff values, then run ${formatCode(
        createPageBuilderVisualReferenceAcceptPassingCommand(report),
      )}.`,
      `- Verify final sign-off with ${formatCode(
        createPageBuilderVisualReferenceAcceptanceCommand(report),
      )}.`,
    ];
  }

  if (report.status === "would-update") {
    return [
      `- Rerun ${formatCode(
        createPageBuilderVisualReferenceImportWriteCommand(report),
      )}.`,
    ];
  }

  return [
    "- Add the missing real design reference PNGs listed above.",
    `- Rerun ${formatCode(
      createPageBuilderVisualReferenceImportWriteCommand(report),
    )}.`,
  ];
}

function createExpectedReferencePath(sourceDir, missing) {
  return `${sourceDir}/${missing.component}-${missing.viewport}.png`;
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
