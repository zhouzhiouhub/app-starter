#!/usr/bin/env node
import {
  createPageBuilderVisualCaptureArtifact,
  formatPageBuilderVisualFixtureCaptureReport,
  formatPageBuilderVisualFixtureCaptureUsage,
  readPageBuilderVisualFixtureCaptureCliConfig,
  runPageBuilderVisualFixtureCapture,
  writePageBuilderVisualCaptureArtifact,
} from "./visual/page-builder-visual-fixture-capture.mjs";

try {
  const config = readPageBuilderVisualFixtureCaptureCliConfig(
    process.argv.slice(2),
  );

  if (config.help) {
    console.log(formatPageBuilderVisualFixtureCaptureUsage().join("\n"));
  } else {
    const result = await runPageBuilderVisualFixtureCapture(config);
    const artifact = createPageBuilderVisualCaptureArtifact(result);

    if (config.capture.reportPath) {
      await writePageBuilderVisualCaptureArtifact(
        config.capture.reportPath,
        artifact,
      );
    }

    console.log(formatPageBuilderVisualFixtureCaptureReport(result).join("\n"));

    if (config.capture.reportPath) {
      console.log(
        `Visual capture artifact written: ${config.capture.reportPath}`,
      );
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
