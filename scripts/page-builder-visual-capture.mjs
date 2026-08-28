#!/usr/bin/env node
import {
  formatPageBuilderVisualCaptureReport,
  formatPageBuilderVisualCaptureUsage,
  readPageBuilderVisualCaptureCliConfig,
  runPageBuilderVisualCapture,
} from "./visual/page-builder-visual-capture.mjs";

try {
  const config = readPageBuilderVisualCaptureCliConfig(process.argv.slice(2));

  if (config.help) {
    console.log(formatPageBuilderVisualCaptureUsage().join("\n"));
  } else {
    const result = await runPageBuilderVisualCapture(config);
    console.log(formatPageBuilderVisualCaptureReport(result).join("\n"));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
