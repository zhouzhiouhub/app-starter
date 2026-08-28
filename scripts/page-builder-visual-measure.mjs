#!/usr/bin/env node
import {
  formatPageBuilderVisualMeasureReport,
  formatPageBuilderVisualMeasureUsage,
  measurePageBuilderVisualAcceptanceManifest,
  readPageBuilderVisualMeasureCliConfig,
  readPageBuilderVisualMeasureManifest,
  writePageBuilderVisualMeasureManifest,
} from "./visual/page-builder-visual-measure.mjs";

try {
  const config = readPageBuilderVisualMeasureCliConfig(process.argv.slice(2));

  if (config.help) {
    console.log(formatPageBuilderVisualMeasureUsage().join("\n"));
  } else {
    const manifest = readPageBuilderVisualMeasureManifest(config.manifestPath);
    const result = measurePageBuilderVisualAcceptanceManifest(manifest, config);

    if (config.write) {
      writePageBuilderVisualMeasureManifest(config.manifestPath, manifest);
    }

    console.log(formatPageBuilderVisualMeasureReport(result).join("\n"));
    process.exitCode = result.status === "invalid" ? 1 : 0;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
