#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  createPageBuilderVisualReferenceImportArtifact,
  importPageBuilderVisualReferences,
} from "./visual/page-builder-visual-reference-import.mjs";
import {
  readPageBuilderVisualReferenceRequestCliConfig,
  writePageBuilderVisualReferenceRequestMarkdown,
} from "./visual/page-builder-visual-reference-request.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runPageBuilderVisualReferenceRequestCli(
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
    const config = readPageBuilderVisualReferenceRequestCliConfig(args);
    const report = importPageBuilderVisualReferences({
      manifestPath: config.manifestPath,
      requireComplete: false,
      sourceDir: config.sourceDir,
      write: false,
    });
    const artifact = createPageBuilderVisualReferenceImportArtifact(report);

    await writePageBuilderVisualReferenceRequestMarkdown(
      config.outputPath,
      artifact,
    );

    stdout(`Visual reference request written: ${config.outputPath}`);
    stdout(
      `Missing references: ${artifact.missingCount}/${artifact.requiredReferenceCount}`,
    );
    const firstMissingReference = artifact.missing[0]?.expectedPath;
    if (firstMissingReference) {
      stdout(`First missing reference: ${firstMissingReference}`);
    }
    return 0;
  } catch (error) {
    stderr(
      `Page Builder visual reference request failed: ${readErrorMessage(
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
  pnpm visual:references:request
  pnpm visual:references:request -- --output artifacts/visual/page-builder-reference-request.md
  pnpm visual:references:request -- --source-dir docs/visual/page-builder-references

Options:
  --source-dir <dir>  Directory containing <component>-<viewport>.png files;
                      defaults to docs/visual/page-builder-references.
  --manifest <path>   Visual acceptance manifest path.
  --output <path>     Write the design handoff Markdown request.
  -h, --help          Show this help.

Evidence:
  This command creates a design-facing request from the same reference intake
  manifest used by visual:references. The terminal summary and Markdown status
  report the missing/required count and the first missing reference path to hand
  off first. It does not import references, measure screenshots, mark evidence
  accepted, or replace approved design exports.`);
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualReferenceRequestCli(
    process.argv.slice(2),
  );
}
