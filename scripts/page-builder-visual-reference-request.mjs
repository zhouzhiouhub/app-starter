#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  createPageBuilderVisualReferenceImportArtifact,
  importPageBuilderVisualReferences,
} from "./visual/page-builder-visual-reference-import.mjs";
import {
  readPageBuilderVisualReferenceRequestCliConfig,
  writePageBuilderVisualMissingReferencePaths,
  writePageBuilderVisualReferenceExportManifest,
  writePageBuilderVisualReferenceExportTable,
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

    const requestArtifact = {
      ...artifact,
      jsonOutputPath: config.jsonOutputPath,
      missingOutputPath: config.missingOutputPath,
      tableOutputPath: config.tableOutputPath,
    };

    await writePageBuilderVisualReferenceRequestMarkdown(
      config.outputPath,
      requestArtifact,
    );

    if (config.missingOutputPath) {
      await writePageBuilderVisualMissingReferencePaths(
        config.missingOutputPath,
        artifact,
      );
    }

    if (config.tableOutputPath) {
      await writePageBuilderVisualReferenceExportTable(
        config.tableOutputPath,
        artifact,
      );
    }

    if (config.jsonOutputPath) {
      await writePageBuilderVisualReferenceExportManifest(
        config.jsonOutputPath,
        artifact,
      );
    }

    stdout(`Visual reference request written: ${config.outputPath}`);
    if (config.missingOutputPath) {
      stdout(
        `Visual missing reference paths written: ${config.missingOutputPath}`,
      );
    }
    if (config.tableOutputPath) {
      stdout(`Visual reference export table written: ${config.tableOutputPath}`);
    }
    if (config.jsonOutputPath) {
      stdout(
        `Visual reference export manifest written: ${config.jsonOutputPath}`,
      );
    }
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
  pnpm visual:references:request -- --missing-output artifacts/visual/page-builder-missing-references.txt
  pnpm visual:references:request -- --table-output artifacts/visual/page-builder-reference-export-table.tsv
  pnpm visual:references:request -- --json-output artifacts/visual/page-builder-reference-export-manifest.json
  pnpm visual:references:request -- --source-dir docs/visual/page-builder-references

Options:
  --source-dir <dir>  Directory containing <component>-<viewport>.png files;
                      defaults to docs/visual/page-builder-references.
  --manifest <path>   Visual acceptance manifest path.
  --output <path>     Write the design handoff Markdown request.
  --missing-output <path>
                      Write a plain text list of missing expected PNG paths.
  --table-output <path>
                      Write a TSV export table with component, viewport,
                      target path, preview path, and target dimensions.
  --json-output <path>
                      Write a JSON export manifest with the same reference tasks.
  -h, --help          Show this help.

Evidence:
  This command creates a design-facing request from the same reference intake
  manifest used by visual:references. The terminal summary and Markdown status
  report the missing/required count and the first missing reference path to hand
  off first. When --missing-output is provided, it also writes a plain text list
  of missing expected PNG paths. When --table-output is provided, it writes a
  TSV export table for design task assignment. When --json-output is provided,
  it writes a machine-readable export manifest for automation handoff. It does
  not import references, measure screenshots, mark evidence accepted, or replace
  approved design exports.`);
}

if (isMainModule()) {
  process.exitCode = await runPageBuilderVisualReferenceRequestCli(
    process.argv.slice(2),
  );
}
