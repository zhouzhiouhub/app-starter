import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

export function createPageBuilderVisualAcceptanceReport(input) {
  const errorCount = input.issues.filter((issue) => issue.severity === "error")
    .length;
  const warningCount = input.issues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const componentCount = mvpPageBuilderComponents.length;
  const viewportCount =
    componentCount * pageBuilderVisualAcceptanceViewports.length;

  return {
    acceptedComponentCount: input.acceptedComponentCount,
    acceptedViewportCount: input.acceptedViewportCount,
    componentCount,
    errorCount,
    issues: input.issues,
    records: input.records,
    schemaVersion: pageBuilderVisualAcceptanceSchemaVersion,
    status: readReportStatus(
      errorCount,
      input.acceptedComponentCount,
      componentCount,
    ),
    targets: input.targets,
    viewportCount,
    warningCount,
  };
}

export function formatPageBuilderVisualAcceptanceReport(report) {
  const lines = [
    `Page Builder visual acceptance (${report.schemaVersion})`,
    `Status: ${report.status}`,
    `Components accepted: ${report.acceptedComponentCount}/${report.componentCount}`,
    `Viewport evidence accepted: ${report.acceptedViewportCount}/${report.viewportCount}`,
    `Target: >=${report.targets.minVisualMatchPercent}% match, <=${report.targets.maxLayoutDeltaPx}px layout delta, <=${report.targets.maxColorDeltaE} color delta`,
  ];
  const pending = report.records
    .filter((record) => !record.accepted)
    .map((record) => record.component);

  if (pending.length > 0) {
    lines.push(`Pending components: ${pending.join(", ")}`);
  }

  if (report.issues.length > 0) {
    lines.push("Issues:");

    for (const issue of report.issues) {
      lines.push(`  - [${issue.severity}] ${issue.message}`);
    }
  }

  return lines;
}

function readReportStatus(errorCount, acceptedComponentCount, componentCount) {
  if (errorCount > 0) {
    return "invalid";
  }

  return acceptedComponentCount === componentCount ? "accepted" : "needs-evidence";
}
