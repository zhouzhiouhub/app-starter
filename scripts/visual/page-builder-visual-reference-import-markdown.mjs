import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

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
      "- Run `pnpm visual:measure -- --write --require-complete` after fixture screenshots are attached.",
    ];
  }

  if (report.status === "updated") {
    return [
      "- Run `pnpm visual:measure -- --write --require-complete`.",
      "- Review the measured diff values, then run `pnpm visual:acceptance -- --require-accepted`.",
    ];
  }

  if (report.status === "would-update") {
    return [
      "- Rerun `pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete`.",
    ];
  }

  return [
    "- Add the missing real design reference PNGs listed above.",
    "- Rerun `pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete`.",
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
