#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  formatPageBuilderVisualAcceptanceReport,
  readPageBuilderVisualAcceptanceCliConfig,
  readPageBuilderVisualAcceptanceManifest,
  validatePageBuilderVisualAcceptanceManifest,
} from "./visual/page-builder-visual-acceptance.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runPageBuilderVisualAcceptanceCli(args) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return 0;
  }

  try {
    const config = readPageBuilderVisualAcceptanceCliConfig(args);
    const manifest = await readPageBuilderVisualAcceptanceManifest(
      config.manifestPath,
    );
    const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
      requireAccepted: config.requireAccepted,
    });

    for (const line of formatPageBuilderVisualAcceptanceReport(report)) {
      console.log(line);
    }

    return report.status === "invalid" ? 1 : 0;
  } catch (error) {
    console.error(
      `Page Builder visual acceptance failed: ${readErrorMessage(error)}`,
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
  pnpm visual:acceptance
  pnpm visual:acceptance -- --require-accepted
  pnpm visual:acceptance -- docs/development/page-builder-visual-acceptance.json

Options:
  --require-accepted  Fail unless every MVP section and viewport is accepted.
  -h, --help          Show this help.

Evidence:
  The default manifest is docs/development/page-builder-visual-acceptance.json.`);
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualAcceptanceCli(
    process.argv.slice(2),
  );
}
