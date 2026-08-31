import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
  createPageBuilderVisualReferenceReportCommand,
} from "./page-builder-visual-reference-import-commands.mjs";

const maxMarkdownTextLength = 420;

export function formatVisualReferenceImport(referenceImport, options = {}) {
  if (!referenceImport) {
    return null;
  }

  return `references ${formatText(referenceImport.status)} (${[
    `${formatText(referenceImport.sourceDirStatus)} source`,
    `${referenceImport.missingCount} missing`,
    `${referenceImport.updateCount} updates`,
    formatRequiredReferenceCoverage(referenceImport, options),
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
    ...missingReferences.map((reference) => `- ${formatCode(reference)}`),
    "",
    "### Visual Reference Intake Commands",
    "",
    ...formatVisualReferenceIntakeCommands(referenceImport),
  ];
}

function formatVisualReferenceIntakeCommands(referenceImport) {
  return [
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
  const coverage = formatRequiredReferenceCoverage(referenceImport);

  return coverage ? [`- Required files: ${coverage}`] : [];
}

function formatRequiredReferenceCoverage(referenceImport, options = {}) {
  if (
    !Number.isFinite(referenceImport.requiredReferenceCount) ||
    !Number.isFinite(referenceImport.requiredReferenceEntryCount)
  ) {
    return "";
  }

  const statusCounts =
    options.includeStatusCounts === false
      ? ""
      : formatRequiredStatusCounts(referenceImport.requiredReferenceStatusCounts);
  const requiredLabel = options.includeRequiredLabel === true ? " required" : "";

  return `${referenceImport.requiredReferenceEntryCount}/${referenceImport.requiredReferenceCount}${requiredLabel}${statusCounts}`;
}

function formatRequiredStatusCounts(counts) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    return "";
  }

  const values = [
    formatStatusCount(counts.missing, "missing"),
    formatStatusCount(counts.ready, "ready"),
    formatStatusCount(counts.wouldUpdate, "would-update"),
    formatStatusCount(counts.updated, "updated"),
    formatStatusCount(counts.invalid, "invalid"),
  ].filter(Boolean);

  return values.length > 0 ? ` (${values.join(", ")})` : "";
}

function formatStatusCount(count, label) {
  return Number.isFinite(count) && count > 0 ? `${count} ${label}` : null;
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
