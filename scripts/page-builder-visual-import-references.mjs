#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  createPageBuilderVisualReferenceImportArtifact,
  formatPageBuilderVisualReferenceImportReport,
  importPageBuilderVisualReferences,
  readPageBuilderVisualReferenceImportCliConfig,
  writePageBuilderVisualReferenceImportArtifact,
  writePageBuilderVisualReferenceImportMarkdown,
} from "./visual/page-builder-visual-reference-import.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runPageBuilderVisualReferenceImportCli(args) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return 0;
  }

  try {
    const config = readPageBuilderVisualReferenceImportCliConfig(args);
    const report = importPageBuilderVisualReferences(config);
    const artifact = createPageBuilderVisualReferenceImportArtifact(report);

    if (config.outputPath) {
      await writePageBuilderVisualReferenceImportArtifact(
        config.outputPath,
        artifact,
      );
    }

    if (config.markdownOutputPath) {
      await writePageBuilderVisualReferenceImportMarkdown(
        config.markdownOutputPath,
        report,
      );
    }

    if (config.json) {
      console.log(JSON.stringify(artifact, null, 2));
    } else {
      for (const line of formatPageBuilderVisualReferenceImportReport(report)) {
        console.log(line);
      }

      if (config.outputPath) {
        console.log(`Visual reference import artifact written: ${config.outputPath}`);
      }

      if (config.markdownOutputPath) {
        console.log(
          `Visual reference import Markdown written: ${config.markdownOutputPath}`,
        );
      }
    }

    return report.status === "invalid" ? 1 : 0;
  } catch (error) {
    console.error(
      `Page Builder visual reference import failed: ${readErrorMessage(error)}`,
    );
    return 1;
  }
}

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

function printHelp() {
  console.log(`Usage:
  pnpm visual:references
  pnpm visual:references:check
  pnpm visual:references -- --write
  pnpm visual:references -- --write --require-complete
  pnpm visual:references -- --json
  pnpm visual:references -- --output reports/visual/page-builder-fixture/visual-reference-import-report.json
  pnpm visual:references -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete
  pnpm visual:references -- --source-dir artifacts/visual/references

Options:
  --source-dir <dir>     Directory containing <component>-<viewport>.png files;
                         defaults to docs/visual/page-builder-references.
  --manifest <path>      Visual acceptance manifest path.
  --json                 Print the machine-readable reference intake report.
  --output <path>        Write a JSON report under tmp/, reports/, artifacts/, or .tmp/.
  --markdown-output <path>
                         Write a Markdown reference intake report.
  --write                Update designReference values in the manifest.
  --require-complete     Fail when any MVP component viewport PNG is missing.
  -h, --help             Show this help.

Evidence:
  Source directories must be safe relative paths under docs/, artifacts/visual/,
  or reports/visual/. When --source-dir is omitted, the retained repo directory
  docs/visual/page-builder-references is used. Importing references resets
  measured metrics and accepted viewport statuses so the evidence must be
  measured again before sign-off.`);
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualReferenceImportCli(
    process.argv.slice(2),
  );
}
