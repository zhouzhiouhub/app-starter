import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
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
    `Source dir status: ${formatCode(report.sourceDirStatus ?? "ready")}`,
    `References updated: ${report.updates.length}`,
    `Missing references: ${report.missing.length}`,
    "",
    "## Required Source Files",
    "",
    ...formatRequiredSourceFiles(report),
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

function formatRequiredSourceFiles(report) {
  const missingByViewport = createReferenceLookup(report.missing);
  const updatesByViewport = createReferenceLookup(report.updates);

  return mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) =>
      formatRequiredSourceFile({
        component,
        missing: missingByViewport.get(createReferenceKey(component, viewport)),
        report,
        update: updatesByViewport.get(createReferenceKey(component, viewport)),
        viewport,
      }),
    ),
  );
}

function formatRequiredSourceFile(input) {
  const expectedPath = createExpectedReferencePath(input.report.sourceDir, {
    component: input.component,
    expectedPath: input.missing?.expectedPath,
    viewport: input.viewport,
  });
  const status = readRequiredSourceFileStatus(input);

  return `- ${formatText(input.component)}.${formatText(
    input.viewport,
  )}: ${status}; ${formatCode(expectedPath)}${formatRequiredSourceFileDetail(
    input,
  )}`;
}

function formatRequiredSourceFileDetail(input) {
  const previewScreenshot = formatPreviewScreenshot(
    input.missing?.previewScreenshot ?? input.update?.previewScreenshot,
  );
  const previewDetail = previewScreenshot
    ? `; preview ${previewScreenshot}`
    : "";

  if (input.missing) {
    return ` - ${formatText(input.missing.reason)}${previewDetail}`;
  }

  if (input.update) {
    return ` - imports ${formatCode(
      input.update.designReference,
    )}${previewDetail}`;
  }

  return previewDetail ? ` - preview ${previewScreenshot}` : "";
}

function readRequiredSourceFileStatus(input) {
  if (input.missing) {
    return "missing";
  }

  if (!input.update) {
    return "ready";
  }

  if (input.report.status === "updated" || input.report.updated === true) {
    return "updated";
  }

  return "would-update";
}

function createReferenceLookup(items) {
  const lookup = new Map();

  if (!Array.isArray(items)) {
    return lookup;
  }

  for (const item of items) {
    lookup.set(createReferenceKey(item.component, item.viewport), item);
  }

  return lookup;
}

function createReferenceKey(component, viewport) {
  return `${component}:${viewport}`;
}

function formatUpdates(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return ["- None"];
  }

  return updates.map(
    (update) =>
      `- ${formatText(update.component)}.${formatText(
        update.viewport,
      )}: ${formatCode(update.designReference)}${formatPreviewDetail(
        update.previewScreenshot,
      )}`,
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
      )}${formatPreviewDetail(missing.previewScreenshot)}`,
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

function createExpectedReferencePath(sourceDir, reference) {
  return typeof reference.expectedPath === "string" &&
    reference.expectedPath.length > 0
    ? reference.expectedPath
    : `${sourceDir}/${reference.component}-${reference.viewport}.png`;
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatPreviewDetail(previewScreenshot) {
  const formatted = formatPreviewScreenshot(previewScreenshot);

  return formatted ? `; preview ${formatted}` : "";
}

function formatPreviewScreenshot(previewScreenshot) {
  if (
    !previewScreenshot ||
    typeof previewScreenshot !== "object" ||
    Array.isArray(previewScreenshot) ||
    typeof previewScreenshot.path !== "string" ||
    previewScreenshot.path.length === 0
  ) {
    return "";
  }

  const dimensions =
    Number.isFinite(previewScreenshot.width) &&
    Number.isFinite(previewScreenshot.height)
      ? ` (${previewScreenshot.width}x${previewScreenshot.height})`
      : "";
  const error =
    typeof previewScreenshot.error === "string" &&
    previewScreenshot.error.length > 0
      ? ` (unreadable: ${formatText(previewScreenshot.error)})`
      : "";

  return `${formatCode(previewScreenshot.path)}${dimensions}${error}`;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
