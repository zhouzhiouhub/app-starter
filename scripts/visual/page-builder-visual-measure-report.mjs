export function formatPageBuilderVisualMeasureReport(result) {
  const lines = [
    "Page Builder visual measurement",
    `Status: ${result.status}`,
    `Measured viewport evidence: ${result.measuredViewportCount}/${result.targetViewportCount}`,
    `Missing viewport evidence: ${result.missingViewportCount}`,
    `Failed viewport evidence: ${result.failedViewportCount}`,
  ];

  for (const measurement of result.measurements) {
    lines.push(
      `  - ${measurement.component}.${measurement.viewport}: ${measurement.visualMatchPercent}% match, ${measurement.maxLayoutDeltaPx}px layout delta, ${measurement.maxColorDeltaE} color delta`,
    );
  }

  if (result.issues.length > 0) {
    lines.push("Issues:");

    for (const issue of result.issues) {
      lines.push(`  - [${issue.severity}] ${issue.message}`);
    }
  }

  return lines;
}

export function formatPageBuilderVisualMeasureUsage() {
  return [
    "Usage:",
    "  pnpm visual:measure",
    "  pnpm visual:measure -- --write",
    "  pnpm visual:measure -- --write --accept-passing --require-complete",
    "",
    "Options:",
    "  --manifest <path>     Visual acceptance manifest path.",
    "  --component <id[,id]> Measure selected MVP component(s).",
    "  --viewport <id[,id]>  Measure desktop and/or mobile.",
    "  --write               Write measured metric fields back to the manifest.",
    "  --accept-passing      Write metrics and mark passing viewport evidence accepted.",
    "  --require-complete    Fail when selected evidence pairs are missing.",
  ];
}
