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
        `    - ${missing.component}.${missing.viewport}: ${missing.reason}`,
      );
    }
  }

  if (report.status === "would-update") {
    lines.push("  Next: rerun with --write to update the manifest.");
  }

  if (report.status === "updated") {
    lines.push(
      "  Next: run pnpm visual:measure -- --write --require-complete.",
    );
  }

  return lines;
}
