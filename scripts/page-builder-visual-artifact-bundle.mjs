#!/usr/bin/env node
import {
  formatPageBuilderVisualArtifactBundleReport,
  formatPageBuilderVisualArtifactBundleUsage,
  readPageBuilderVisualArtifactBundleCliConfig,
  readPageBuilderVisualArtifactBundleExitCode,
  runPageBuilderVisualArtifactBundle,
} from "./visual/page-builder-visual-artifact-bundle.mjs";

try {
  const config = readPageBuilderVisualArtifactBundleCliConfig(
    process.argv.slice(2),
  );

  if (config.help) {
    console.log(formatPageBuilderVisualArtifactBundleUsage().join("\n"));
  } else {
    const result = await runPageBuilderVisualArtifactBundle(config);

    console.log(formatPageBuilderVisualArtifactBundleReport(result).join("\n"));
    process.exitCode = readPageBuilderVisualArtifactBundleExitCode(result);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
