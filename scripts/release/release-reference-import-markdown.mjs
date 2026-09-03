import { formatRequiredSourceReferenceAvailability } from "../visual/page-builder-visual-reference-summary-format.mjs";

export function formatReferenceImportMarkdown(
  referenceImport,
  { formatCode = formatDefault, formatText = formatDefault } = {},
) {
  if (!referenceImport) {
    return ["- Reference import: not recorded"];
  }

  return [
    `- Reference import: ${formatText(referenceImport.status)}`,
    `- Reference source dir: ${formatCode(referenceImport.sourceDir)} (${formatText(
      referenceImport.sourceDirStatus,
    )})`,
    `- Reference missing: ${referenceImport.missingCount}`,
    ...formatMissingReferences(referenceImport, formatCode),
    ...formatFirstMissingReferencePreview(referenceImport, formatCode),
    `- Reference updates: ${referenceImport.updateCount}`,
    ...formatRequiredReferences(referenceImport),
  ];
}

function formatFirstMissingReferencePreview(referenceImport, formatCode) {
  return typeof referenceImport.firstMissingReferencePreview === "string" &&
    referenceImport.firstMissingReferencePreview.length > 0
    ? [
        `- First missing reference preview: ${formatCode(
          referenceImport.firstMissingReferencePreview,
        )}`,
      ]
    : [];
}

export function formatReferenceImportGateSummary(
  referenceImport,
  formatText = formatDefault,
) {
  if (!referenceImport) {
    return "";
  }

  return `, references ${formatText(referenceImport.status)}, ${referenceImport.missingCount} missing${formatRequiredReferenceGateSummary(referenceImport)}${formatFirstMissingReferencePreviewGate(referenceImport, formatText)}`;
}

function formatDefault(value) {
  return value ?? "unknown";
}

function formatMissingReferences(referenceImport, formatCode) {
  if ((referenceImport.missingCount ?? 0) === 0) {
    return [];
  }

  const values = Array.isArray(referenceImport.missingReferences)
    ? referenceImport.missingReferences
    : [];

  return [
    `- Reference missing files: ${
      values.length > 0 ? values.map(formatCode).join(", ") : "not recorded"
    }`,
  ];
}

function formatRequiredReferences(referenceImport) {
  const coverage = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeNoun: false,
  });

  return coverage ? [`- Required source references: ${coverage}`] : [];
}

function formatRequiredReferenceGateSummary(referenceImport) {
  const coverage = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeStatusCounts: false,
  });

  return coverage ? `, ${coverage}` : "";
}

function formatFirstMissingReferencePreviewGate(referenceImport, formatText) {
  return typeof referenceImport.firstMissingReferencePreview === "string" &&
    referenceImport.firstMissingReferencePreview.length > 0
    ? `, first missing preview ${formatText(
        referenceImport.firstMissingReferencePreview,
      )}`
    : "";
}
