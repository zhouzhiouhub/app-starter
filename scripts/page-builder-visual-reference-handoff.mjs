#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";
import {
  createPageBuilderVisualReferenceHandoff,
  readPageBuilderVisualReferenceHandoffCliConfig,
} from "./visual/page-builder-visual-reference-handoff.mjs";

export async function runPageBuilderVisualReferenceHandoffCli(
  args = [],
  input = {},
) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readPageBuilderVisualReferenceHandoffCliConfig(args);
    const result = await createPageBuilderVisualReferenceHandoff(config);
    const manifest = result.handoffManifest;

    stdout(`Visual reference handoff package written: ${config.outputDir}`);
    stdout(
      `Visual reference handoff manifest written: ${result.paths.handoffManifest}`,
    );
    stdout(
      `Preview screenshots copied: ${
        manifest.previewCount - manifest.missingPreviewCount
      }/${manifest.previewCount}`,
    );
    stdout(
      `Missing references: ${manifest.missingCount}/${manifest.requiredReferenceCount}`,
    );
    const firstMissingReference = result.artifact.missing[0]?.expectedPath;
    if (firstMissingReference) {
      stdout(`First missing reference: ${firstMissingReference}`);
    }
    return 0;
  } catch (error) {
    stderr(
      `Page Builder visual reference handoff failed: ${readErrorMessage(
        error,
      )}`,
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

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm visual:references:handoff
  pnpm visual:references:handoff -- --output-dir artifacts/visual/page-builder-reference-handoff
  pnpm visual:references:handoff -- --source-dir docs/visual/page-builder-references

Options:
  --source-dir <dir>  Directory containing <component>-<viewport>.png files;
                      defaults to docs/visual/page-builder-references.
  --manifest <path>   Visual acceptance manifest path.
  --output-dir <dir>  Write a design handoff package directory.
  -h, --help          Show this help.

Evidence:
  This command writes a self-contained local handoff directory with the design
  reference request Markdown, missing path list, TSV export table, JSON export
  manifest, copied preview screenshots, and a handoff manifest with copied
  preview dimensions, byte sizes, and sha256 checksums. It does not create
  reference PNGs, import references, measure screenshots, or mark visual
  evidence accepted.`);
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualReferenceHandoffCli(
    process.argv.slice(2),
  );
}
