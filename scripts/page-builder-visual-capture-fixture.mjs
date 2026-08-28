#!/usr/bin/env node
import {
  formatPageBuilderVisualFixtureCaptureReport,
  formatPageBuilderVisualFixtureCaptureUsage,
  readPageBuilderVisualFixtureCaptureCliConfig,
  runPageBuilderVisualFixtureCapture,
} from "./visual/page-builder-visual-fixture-capture.mjs";

try {
  const config = readPageBuilderVisualFixtureCaptureCliConfig(
    process.argv.slice(2),
  );

  if (config.help) {
    console.log(formatPageBuilderVisualFixtureCaptureUsage().join("\n"));
  } else {
    const result = await runPageBuilderVisualFixtureCapture(config);
    console.log(formatPageBuilderVisualFixtureCaptureReport(result).join("\n"));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
