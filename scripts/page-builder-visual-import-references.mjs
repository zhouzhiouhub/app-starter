#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  formatPageBuilderVisualReferenceImportReport,
  importPageBuilderVisualReferences,
  readPageBuilderVisualReferenceImportCliConfig,
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

    for (const line of formatPageBuilderVisualReferenceImportReport(report)) {
      console.log(line);
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
  pnpm visual:references -- --source-dir docs/visual/page-builder-references
  pnpm visual:references -- --source-dir docs/visual/page-builder-references --write
  pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete

Options:
  --source-dir <dir>     Directory containing <component>-<viewport>.png files.
  --manifest <path>      Visual acceptance manifest path.
  --write                Update designReference values in the manifest.
  --require-complete     Fail when any MVP component viewport PNG is missing.
  -h, --help             Show this help.

Evidence:
  Source directories must be safe relative paths under docs/, artifacts/visual/,
  or reports/visual/. Importing references resets measured metrics and accepted
  viewport statuses so the evidence must be measured again before sign-off.`);
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualReferenceImportCli(
    process.argv.slice(2),
  );
}
