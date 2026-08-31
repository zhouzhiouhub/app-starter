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
    `- Reference updates: ${referenceImport.updateCount}`,
    ...formatRequiredReferences(referenceImport),
  ];
}

export function formatReferenceImportGateSummary(
  referenceImport,
  formatText = formatDefault,
) {
  if (!referenceImport) {
    return "";
  }

  return `, references ${formatText(referenceImport.status)}, ${referenceImport.missingCount} missing${formatRequiredReferenceGateSummary(referenceImport)}`;
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
  if (
    !Number.isFinite(referenceImport.requiredReferenceCount) ||
    !Number.isFinite(referenceImport.requiredReferenceEntryCount)
  ) {
    return [];
  }

  return [
    `- Reference required: ${formatRequiredReferenceCoverage(referenceImport)}`,
  ];
}

function formatRequiredReferenceGateSummary(referenceImport) {
  if (
    !Number.isFinite(referenceImport.requiredReferenceCount) ||
    !Number.isFinite(referenceImport.requiredReferenceEntryCount)
  ) {
    return "";
  }

  return `, ${referenceImport.requiredReferenceEntryCount}/${referenceImport.requiredReferenceCount} required`;
}

function formatRequiredReferenceCoverage(referenceImport) {
  if (
    !Number.isFinite(referenceImport.requiredReferenceCount) ||
    !Number.isFinite(referenceImport.requiredReferenceEntryCount)
  ) {
    return "";
  }

  return `${referenceImport.requiredReferenceEntryCount}/${referenceImport.requiredReferenceCount}${formatRequiredStatusCounts(referenceImport.requiredReferenceStatusCounts)}`;
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
