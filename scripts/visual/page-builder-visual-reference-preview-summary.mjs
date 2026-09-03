import { formatSmokeText } from "../smoke/smoke-text.mjs";

const defaultMaxSummaryLength = 420;

export function readPageBuilderVisualFirstMissingReference(input) {
  const missingReferences = Array.isArray(input?.missing) ? input.missing : [];

  if (missingReferences.length > 0) {
    return missingReferences[0];
  }

  const requiredReferences = Array.isArray(input?.requiredReferences)
    ? input.requiredReferences
    : [];

  return (
    requiredReferences.find((reference) => reference?.status === "missing") ??
    null
  );
}

export function formatPageBuilderVisualFirstMissingPreview(
  input,
  options = {},
) {
  return formatPageBuilderVisualReferencePreviewSummary(
    readPageBuilderVisualFirstMissingReference(input),
    options,
  );
}

export function formatPageBuilderVisualReferencePreviewSummary(
  reference,
  options = {},
) {
  const previewScreenshot = reference?.previewScreenshot;

  if (
    !previewScreenshot ||
    typeof previewScreenshot.path !== "string" ||
    previewScreenshot.path.length === 0
  ) {
    return null;
  }

  const path = formatSmokeText(previewScreenshot.path, {
    fallback: "",
    maxLength: options.maxLength ?? defaultMaxSummaryLength,
  });

  if (!path) {
    return null;
  }

  return `${path}${formatPreviewDimensions(previewScreenshot)}`;
}

function formatPreviewDimensions(previewScreenshot) {
  return Number.isFinite(previewScreenshot.width) &&
    Number.isFinite(previewScreenshot.height)
    ? ` (${previewScreenshot.width}x${previewScreenshot.height})`
    : "";
}
