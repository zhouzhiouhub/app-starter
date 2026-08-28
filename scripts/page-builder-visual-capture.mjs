#!/usr/bin/env node
import {
  createPageBuilderVisualCaptureArtifact,
  formatPageBuilderVisualCaptureReport,
  formatPageBuilderVisualCaptureUsage,
  readPageBuilderVisualCaptureCliConfig,
  runPageBuilderVisualCapture,
  writePageBuilderVisualCaptureArtifact,
} from "./visual/page-builder-visual-capture.mjs";

try {
  const config = readPageBuilderVisualCaptureCliConfig(process.argv.slice(2));

  if (config.help) {
    console.log(formatPageBuilderVisualCaptureUsage().join("\n"));
  } else {
    const result = await runPageBuilderVisualCapture(config);
    const artifact = createPageBuilderVisualCaptureArtifact(result);

    if (config.reportPath) {
      await writePageBuilderVisualCaptureArtifact(config.reportPath, artifact);
    }

    console.log(formatPageBuilderVisualCaptureReport(result).join("\n"));

    if (config.reportPath) {
      console.log(`Visual capture artifact written: ${config.reportPath}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
