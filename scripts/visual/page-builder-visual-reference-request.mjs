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
} from "./page-builder-visual-reference-import-commands.mjs";
import {
  normalizeVisualReferenceImportMarkdownOutputPath,
  normalizeVisualReferenceSourceDir,
} from "./page-builder-visual-reference-import-config.mjs";

export const defaultPageBuilderVisualReferenceRequestOutputPath =
  "artifacts/visual/page-builder-reference-request.md";

const maxMarkdownTextLength = 420;

export function readPageBuilderVisualReferenceRequestCliConfig(args = []) {
  const input = {
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    outputPath: defaultPageBuilderVisualReferenceRequestOutputPath,
    sourceDir: defaultPageBuilderVisualReferenceSourceDir,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const option = normalizedArgs[index];

    switch (option) {
      case "--manifest":
        input.manifestPath = readOptionValue(option, normalizedArgs, index);
        index += 1;
        break;
      case "--output":
        input.outputPath = readOptionValue(option, normalizedArgs, index);
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
    outputPath: normalizeVisualReferenceImportMarkdownOutputPath(
      input.outputPath,
    ),
    sourceDir: normalizeVisualReferenceSourceDir(input.sourceDir),
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
    "",
    "## Export Requirements",
    "",
    "- Export real PNGs from the approved design source.",
    "- Use the exact file names below.",
    "- Do not use fixture screenshots, generated placeholders, or temporary exports.",
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
      )}${formatPreview(reference.previewScreenshot)}`,
  );
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
