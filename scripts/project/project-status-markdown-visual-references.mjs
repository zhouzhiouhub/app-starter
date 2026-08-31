import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxMarkdownTextLength = 420;

export function formatVisualReferenceImport(referenceImport) {
  if (!referenceImport) {
    return null;
  }

  return `references ${formatText(referenceImport.status)} (${formatText(
    referenceImport.sourceDirStatus,
  )} source, ${referenceImport.missingCount} missing, ${
    referenceImport.updateCount
  } updates)`;
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
    ...missingReferences.map((reference) => `- ${formatCode(reference)}`),
  ];
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
