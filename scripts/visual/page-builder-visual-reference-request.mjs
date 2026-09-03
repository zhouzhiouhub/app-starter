import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  defaultPageBuilderVisualAcceptanceManifestPath,
  defaultPageBuilderVisualReferenceSourceDir,
} from "./page-builder-visual-acceptance-constants.mjs";
import {
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
  createPageBuilderVisualReferenceReportCommand,
} from "./page-builder-visual-reference-import-commands.mjs";
import {
  normalizeVisualReferenceImportMarkdownOutputPath,
  normalizeVisualReferenceSourceDir,
} from "./page-builder-visual-reference-import-config.mjs";
import {
  normalizeVisualReferenceExportTableOutputPath,
  normalizeVisualReferenceExportManifestOutputPath,
  normalizeVisualReferenceMissingOutputPath,
} from "./page-builder-visual-reference-missing-output.mjs";
import {
  formatPageBuilderVisualFirstMissingPreview,
} from "./page-builder-visual-reference-preview-summary.mjs";

export {
  defaultPageBuilderVisualMissingReferencesOutputPath,
  defaultPageBuilderVisualReferenceExportTableOutputPath,
  defaultPageBuilderVisualReferenceExportManifestOutputPath,
  normalizeVisualReferenceExportManifestOutputPath,
  normalizeVisualReferenceExportTableOutputPath,
  normalizeVisualReferenceMissingOutputPath,
  writePageBuilderVisualMissingReferencePaths,
  writePageBuilderVisualReferenceExportManifest,
  writePageBuilderVisualReferenceExportTable,
} from "./page-builder-visual-reference-missing-output.mjs";

export const defaultPageBuilderVisualReferenceRequestOutputPath =
  "artifacts/visual/page-builder-reference-request.md";

const maxMarkdownTextLength = 420;

export function readPageBuilderVisualReferenceRequestCliConfig(args = []) {
  const input = {
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    jsonOutputPath: null,
    missingOutputPath: null,
    outputPath: defaultPageBuilderVisualReferenceRequestOutputPath,
    sourceDir: defaultPageBuilderVisualReferenceSourceDir,
    tableOutputPath: null,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const option = normalizedArgs[index];

    switch (option) {
      case "--manifest":
        input.manifestPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--json-output":
        input.jsonOutputPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--missing-output":
        input.missingOutputPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--output":
        input.outputPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--table-output":
        input.tableOutputPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--source-dir":
        input.sourceDir = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      default:
        throw new Error(`Unknown visual reference request option: ${option}`);
    }
  }

  return {
    manifestPath: input.manifestPath,
    jsonOutputPath: input.jsonOutputPath
      ? normalizeVisualReferenceExportManifestOutputPath(input.jsonOutputPath)
      : null,
    missingOutputPath: input.missingOutputPath
      ? normalizeVisualReferenceMissingOutputPath(input.missingOutputPath)
      : null,
    outputPath: normalizeVisualReferenceImportMarkdownOutputPath(
      input.outputPath,
    ),
    sourceDir: normalizeVisualReferenceSourceDir(input.sourceDir),
    tableOutputPath: input.tableOutputPath
      ? normalizeVisualReferenceExportTableOutputPath(input.tableOutputPath)
      : null,
  };
}

export function createPageBuilderVisualReferenceRequestMarkdown(input) {
  const references = Array.isArray(input.requiredReferences)
    ? input.requiredReferences
    : [];
  const missingReferences = references.filter(
    (reference) => reference.status === "missing",
  );
  const reportContext = {
    manifestPath: input.manifestPath,
    sourceDir: input.sourceDir,
  };
  const lines = [
    "# Page Builder Design Reference Request",
    "",
    `Status: ${formatCode(readStatus(input))}`,
    `Source dir: ${formatCode(input.sourceDir)}`,
    `Manifest: ${formatCode(input.manifestPath)}`,
    `Missing references: ${missingReferences.length}/${references.length}`,
    `First missing reference: ${formatCode(
      missingReferences[0]?.expectedPath ?? "none",
    )}`,
    `First missing reason: ${formatText(missingReferences[0]?.reason ?? "none")}`,
    `First missing preview: ${formatCode(
      formatPageBuilderVisualFirstMissingPreview({
        requiredReferences: references,
      }) ?? "none",
    )}`,
    ...formatMissingOutputPath(input.missingOutputPath),
    ...formatTableOutputPath(input.tableOutputPath),
    ...formatManifestOutputPath(input.jsonOutputPath),
    "",
    "## Export Requirements",
    "",
    "- Export real PNGs from the approved design source.",
    "- Use the exact file names below.",
    "- Export each PNG at the matching preview viewport size shown as reference size.",
    "- Do not use fixture screenshots, generated placeholders, or temporary exports.",
    "",
    "## Reference PNG Dimensions",
    "",
    ...formatReferenceDimensions(references),
    "",
    "## Missing Files",
    "",
    ...formatReferences(missingReferences),
    "",
    "## All Required Files",
    "",
    ...formatReferences(references),
    "",
    "## After Delivery",
    "",
    `- Run ${formatCode(
      createPageBuilderVisualReferenceReportCommand(reportContext),
    )}.`,
    `- Run ${formatCode(
      createPageBuilderVisualReferenceImportWriteCommand(reportContext),
    )}.`,
    `- Run ${formatCode(
      createPageBuilderVisualReferenceCaptureCommand(reportContext),
    )}.`,
    `- Run ${formatCode(
      createPageBuilderVisualReferenceMeasureCommand(reportContext),
    )}.`,
    `- When review passes, run ${formatCode(
      createPageBuilderVisualReferenceAcceptPassingCommand(reportContext),
    )}.`,
    `- Verify final sign-off with ${formatCode(
      createPageBuilderVisualReferenceAcceptanceCommand(reportContext),
    )}.`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

export async function writePageBuilderVisualReferenceRequestMarkdown(
  outputPath,
  artifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createPageBuilderVisualReferenceRequestMarkdown(artifact),
    "utf8",
  );
}

function formatReferences(references) {
  if (references.length === 0) {
    return ["- None"];
  }

  return references.map(
    (reference) =>
      `- [ ] ${formatCode(reference.expectedPath)} - ${formatText(
        reference.component,
      )}.${formatText(reference.viewport)}; ${formatText(
        reference.status,
      )}${formatReason(reference)}; ${formatReferenceSize(
        reference.previewScreenshot,
      )}${formatPreview(reference.previewScreenshot)}`,
  );
}

function formatReferenceDimensions(references) {
  if (references.length === 0) {
    return ["- None"];
  }

  return references.map(
    (reference) =>
      `- ${formatText(reference.component)}.${formatText(
        reference.viewport,
      )}: ${formatReferenceSize(reference.previewScreenshot)}; ${formatCode(
        reference.expectedPath,
      )}`,
  );
}

function formatReferenceSize(previewScreenshot) {
  return Number.isFinite(previewScreenshot?.width) &&
    Number.isFinite(previewScreenshot?.height)
    ? `reference size ${previewScreenshot.width}x${previewScreenshot.height}`
    : "reference size unknown";
}

function formatPreview(previewScreenshot) {
  if (!previewScreenshot?.path) {
    return "";
  }

  const dimensions =
    Number.isFinite(previewScreenshot.width) &&
    Number.isFinite(previewScreenshot.height)
      ? ` (${previewScreenshot.width}x${previewScreenshot.height})`
      : "";

  return `; preview ${formatCode(previewScreenshot.path)}${dimensions}`;
}

function formatReason(reference) {
  return typeof reference.reason === "string" && reference.reason.length > 0
    ? `; reason ${formatText(reference.reason)}`
    : "";
}

function formatMissingOutputPath(outputPath) {
  return outputPath ? [`Missing path output: ${formatCode(outputPath)}`] : [];
}

function formatTableOutputPath(outputPath) {
  return outputPath ? [`Export table output: ${formatCode(outputPath)}`] : [];
}

function formatManifestOutputPath(outputPath) {
  return outputPath
    ? [`Export manifest output: ${formatCode(outputPath)}`]
    : [];
}

function readStatus(input) {
  if (typeof input.status === "string" && input.status.length > 0) {
    return input.status;
  }

  return input.complete ? "ready" : "needs-evidence";
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

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
