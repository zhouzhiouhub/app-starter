#!/usr/bin/env node
import {
  checkPageBuilderVisualArtifact,
  formatPageBuilderVisualArtifactCheckReport,
  formatPageBuilderVisualArtifactCheckUsage,
  readPageBuilderVisualArtifactCheckCliConfig,
} from "./visual/page-builder-visual-artifact-check.mjs";

try {
  const config = readPageBuilderVisualArtifactCheckCliConfig(
    process.argv.slice(2),
  );

  if (config.help) {
    console.log(formatPageBuilderVisualArtifactCheckUsage().join("\n"));
  } else {
    const report = checkPageBuilderVisualArtifact(config);

    if (config.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatPageBuilderVisualArtifactCheckReport(report).join("\n"));
    }

    process.exitCode = report.status === "complete" ? 0 : 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
