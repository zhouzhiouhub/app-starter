import {
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
} from "./page-builder-visual-reference-import-commands.mjs";

export function formatPageBuilderVisualReferenceImportReport(report) {
  const lines = [
    "Page Builder visual reference import",
    `  Status: ${report.status}`,
    `  Manifest: ${report.manifestPath}`,
    `  Source dir: ${report.sourceDir}`,
    `  References updated: ${report.updates.length}`,
    `  Missing references: ${report.missing.length}`,
  ];

  if (report.updates.length > 0) {
    lines.push("  Updates:");

    for (const update of report.updates) {
      lines.push(
        `    - ${update.component}.${update.viewport}: ${update.designReference}`,
      );
    }
  }

  if (report.missing.length > 0) {
    lines.push("  Missing:");

    for (const missing of report.missing) {
      lines.push(
        `    - ${missing.component}.${missing.viewport}: ${missing.reason}; expected ${createExpectedReferencePath(
          report.sourceDir,
          missing,
        )}`,
      );
    }
  }

  if (report.status === "would-update") {
    lines.push(
      `  Next: rerun ${createPageBuilderVisualReferenceImportWriteCommand(
        report,
      )}.`,
    );
  }

  if (report.status === "updated") {
    lines.push(
      `  Next: run ${createPageBuilderVisualReferenceCaptureCommand(report)}.`,
    );
    lines.push(
      `  Next: run ${createPageBuilderVisualReferenceMeasureCommand(report)}.`,
    );
  }

  if (report.status === "invalid" || report.status === "needs-evidence") {
    lines.push("  Next: add the missing real design reference PNGs listed above.");
    lines.push(
      `  Next: rerun ${createPageBuilderVisualReferenceImportWriteCommand(
        report,
      )}.`,
    );
  }

  return lines;
}

function createExpectedReferencePath(sourceDir, missing) {
  return `${sourceDir}/${missing.component}-${missing.viewport}.png`;
}
