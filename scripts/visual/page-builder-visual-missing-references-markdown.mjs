import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
  createPageBuilderVisualReferenceReportCommand,
  createPageBuilderVisualReferenceRequestCommand,
} from "./page-builder-visual-reference-import-commands.mjs";
import { formatRequiredSourceReferenceAvailability } from "./page-builder-visual-reference-summary-format.mjs";

const maxMarkdownTextLength = 420;

export function formatVisualReferenceImport(referenceImport, options = {}) {
  if (!referenceImport) {
    return null;
  }

  const required = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeNoun: options.includeRequiredLabel === true,
    includeStatusCounts: options.includeStatusCounts,
  });

  return `references ${formatText(referenceImport.status)} (${[
    `${formatText(referenceImport.sourceDirStatus)} source`,
    `${referenceImport.missingCount} missing`,
    `${referenceImport.updateCount} updates`,
    required,
    formatFirstMissingReferenceReason(referenceImport),
    formatFirstMissingReferencePreview(referenceImport),
  ]
    .filter(Boolean)
    .join(", ")})`;
}

export function formatMissingVisualReferenceFiles(visual) {
  const referenceImport = visual.artifactCheck?.referenceImport;
  const missingReferences = Array.isArray(referenceImport?.missingReferences)
    ? referenceImport.missingReferences
    : [];

  if (missingReferences.length === 0) {
    return [];
  }

  return [
    "",
    "### Missing Visual References",
    "",
    `- Source dir: ${formatCode(referenceImport.sourceDir)}`,
    `- Missing files: ${referenceImport.missingCount}`,
    ...formatRequiredReferenceLines(referenceImport),
    ...formatFirstMissingReferenceReasonLines(referenceImport),
    ...formatFirstMissingReferencePreviewLines(referenceImport),
    ...missingReferences.map((reference) => `- ${formatCode(reference)}`),
    "",
    "### Visual Reference Intake Commands",
    "",
    ...formatVisualReferenceIntakeCommands(referenceImport),
  ];
}

function formatFirstMissingReferencePreview(referenceImport) {
  return typeof referenceImport.firstMissingReferencePreview === "string" &&
    referenceImport.firstMissingReferencePreview.length > 0
    ? `first missing preview ${formatText(
        referenceImport.firstMissingReferencePreview,
      )}`
    : null;
}

function formatFirstMissingReferenceReason(referenceImport) {
  return typeof referenceImport.firstMissingReferenceReason === "string" &&
    referenceImport.firstMissingReferenceReason.length > 0
    ? `first missing reason ${formatText(
        referenceImport.firstMissingReferenceReason,
      )}`
    : null;
}

function formatFirstMissingReferenceReasonLines(referenceImport) {
  return typeof referenceImport.firstMissingReferenceReason === "string" &&
    referenceImport.firstMissingReferenceReason.length > 0
    ? [
        `- First missing reason: ${formatText(
          referenceImport.firstMissingReferenceReason,
        )}`,
      ]
    : [];
}

function formatFirstMissingReferencePreviewLines(referenceImport) {
  return typeof referenceImport.firstMissingReferencePreview === "string" &&
    referenceImport.firstMissingReferencePreview.length > 0
    ? [
        `- First missing preview: ${formatCode(
          referenceImport.firstMissingReferencePreview,
        )}`,
      ]
    : [];
}

function formatVisualReferenceIntakeCommands(referenceImport) {
  return [
    [
      "Design request",
      createPageBuilderVisualReferenceRequestCommand(referenceImport),
    ],
    [
      "Reference report",
      createPageBuilderVisualReferenceReportCommand(referenceImport),
    ],
    [
      "Import",
      createPageBuilderVisualReferenceImportWriteCommand(referenceImport),
    ],
    [
      "Capture fixture",
      createPageBuilderVisualReferenceCaptureCommand(referenceImport),
    ],
    [
      "Measure",
      createPageBuilderVisualReferenceMeasureCommand(referenceImport),
    ],
    [
      "Accept passing",
      createPageBuilderVisualReferenceAcceptPassingCommand(referenceImport),
    ],
    [
      "Verify",
      createPageBuilderVisualReferenceAcceptanceCommand(referenceImport),
    ],
  ].map(([label, command]) => `- ${label}: ${formatCode(command)}`);
}

function formatRequiredReferenceLines(referenceImport) {
  const coverage = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeNoun: false,
  });

  return coverage ? [`- Required source references: ${coverage}`] : [];
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
