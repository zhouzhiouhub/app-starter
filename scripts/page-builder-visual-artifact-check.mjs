#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import {
  checkPageBuilderVisualArtifact,
  formatPageBuilderVisualArtifactCheckReport,
  formatPageBuilderVisualArtifactCheckUsage,
  readPageBuilderVisualArtifactCheckCliConfig,
  writePageBuilderVisualArtifactCheckArtifact,
  writePageBuilderVisualArtifactCheckMarkdown,
} from "./visual/page-builder-visual-artifact-check.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runPageBuilderVisualArtifactCheckCli(args, input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  try {
    const config = readPageBuilderVisualArtifactCheckCliConfig(args, input.env);

    if (config.help) {
      stdout(formatPageBuilderVisualArtifactCheckUsage().join("\n"));
      return 0;
    }

    const report = (input.checkArtifact ?? checkPageBuilderVisualArtifact)(
      config,
      { cwd: input.cwd },
    );

    if (config.outputPath) {
      await (input.writeArtifact ?? writePageBuilderVisualArtifactCheckArtifact)(
        config.outputPath,
        report,
      );
    }

    if (config.markdownOutputPath) {
      await (input.writeMarkdown ??
        writePageBuilderVisualArtifactCheckMarkdown)(
        config.markdownOutputPath,
        report,
      );
    }

    if (config.json) {
      stdout(JSON.stringify(report, null, 2));
    } else {
      stdout(formatPageBuilderVisualArtifactCheckReport(report).join("\n"));

      if (config.markdownOutputPath) {
        stdout(
          `Visual artifact check Markdown written: ${config.markdownOutputPath}`,
        );
      }

      if (config.outputPath) {
        stdout(`Visual artifact check artifact written: ${config.outputPath}`);
      }
    }

    return report.status === "complete" ? 0 : 1;
  } catch (error) {
    stderr(readErrorMessage(error));
    return 1;
  }
}

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualArtifactCheckCli(
    process.argv.slice(2),
  );
}
