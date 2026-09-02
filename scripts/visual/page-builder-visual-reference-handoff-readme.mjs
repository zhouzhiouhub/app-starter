import {
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
  createPageBuilderVisualReferenceReportCommand,
} from "./page-builder-visual-reference-import-commands.mjs";

export function createPageBuilderVisualReferenceHandoffReadme(input) {
  const manifest = input.handoffManifest;
  const artifact = input.artifact;
  const copiedPreviewCount = manifest.previewCount - manifest.missingPreviewCount;
  const commandContext = {
    manifestPath: artifact.manifestPath,
    sourceDir: artifact.sourceDir,
  };
  const firstMissingReference = artifact.missing[0]?.expectedPath ?? null;
  const lines = [
    "# Page Builder Visual Reference Handoff",
    "",
    "This package coordinates real design reference PNG exports for MVP visual acceptance.",
    "It does not create reference PNGs, import references, measure screenshots, or mark evidence accepted.",
    "",
    "## Status",
    "",
    `- Reference status: ${formatCode(manifest.status)}`,
    `- Handoff complete: ${formatCode(manifest.handoffComplete ? "yes" : "no")}`,
    `- Missing references: ${formatCode(
      `${manifest.missingCount}/${manifest.requiredReferenceCount}`,
    )}`,
    `- Preview screenshots copied: ${formatCode(
      `${copiedPreviewCount}/${manifest.previewCount}`,
    )}`,
    `- Source dir: ${formatCode(manifest.sourceDir)}`,
    `- Acceptance manifest: ${formatCode(artifact.manifestPath)}`,
    ...formatFirstMissingReference(firstMissingReference),
    "",
    "## Files",
    "",
    `- Request Markdown: ${formatCode(manifest.files.requestMarkdown)}`,
    `- Missing path list: ${formatCode(manifest.files.missingPaths)}`,
    `- Export task table: ${formatCode(manifest.files.table)}`,
    `- Export manifest: ${formatCode(manifest.files.exportManifest)}`,
    `- Handoff manifest: ${formatCode(manifest.files.handoffManifest)}`,
    `- Preview screenshot directory: ${formatCode(manifest.files.previewDir)}`,
    "",
    "## Preview Screenshots",
    "",
    ...formatPreviewScreenshots(manifest.previewScreenshots),
    "",
    "## After Design Delivery",
    "",
    `- Place exported PNGs in ${formatCode(
      manifest.sourceDir,
    )} using the exact file names from the request.`,
    `- Run ${formatCode(createPageBuilderVisualReferenceReportCommand(commandContext))}.`,
    `- Run ${formatCode(
      createPageBuilderVisualReferenceImportWriteCommand(commandContext),
    )}.`,
    `- Run ${formatCode(
      createPageBuilderVisualReferenceCaptureCommand(commandContext),
    )}.`,
    `- Run ${formatCode(
      createPageBuilderVisualReferenceMeasureCommand(commandContext),
    )}.`,
    `- When review passes, run ${formatCode(
      createPageBuilderVisualReferenceAcceptPassingCommand(commandContext),
    )}.`,
    `- Verify final sign-off with ${formatCode(
      createPageBuilderVisualReferenceAcceptanceCommand(commandContext),
    )}.`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function formatFirstMissingReference(expectedPath) {
  return expectedPath
    ? [`- First missing reference: ${formatCode(expectedPath)}`]
    : [];
}

function formatPreviewScreenshots(previews) {
  if (!Array.isArray(previews) || previews.length === 0) {
    return ["- None"];
  }

  return previews.map(formatPreviewScreenshot);
}

function formatPreviewScreenshot(preview) {
  if (preview.status === "copied") {
    return `- ${formatText(preview.component)}.${formatText(
      preview.viewport,
    )}: copied, ${preview.width}x${preview.height}, ${preview.byteSize} bytes, sha256 ${formatCode(
      preview.sha256,
    )}, ${formatCode(preview.handoffPath)}`;
  }

  return `- ${formatText(preview.component)}.${formatText(
    preview.viewport,
  )}: missing, ${formatText(preview.reason ?? "preview unavailable")}, ${formatCode(
    preview.handoffPath,
  )}`;
}

function formatCode(value) {
  return `\`${formatText(value)}\``;
}

function formatText(value) {
  return String(value ?? "").replaceAll("`", "'");
}
