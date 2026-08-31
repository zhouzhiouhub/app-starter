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
    `- Reference updates: ${referenceImport.updateCount}`,
  ];
}

export function formatReferenceImportGateSummary(
  referenceImport,
  formatText = formatDefault,
) {
  if (!referenceImport) {
    return "";
  }

  return `, references ${formatText(referenceImport.status)}, ${referenceImport.missingCount} missing`;
}

function formatDefault(value) {
  return value ?? "unknown";
}
