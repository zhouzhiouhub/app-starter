#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  createReleaseNotesFromConfig,
  readReleaseNotesCliConfig,
  writeReleaseNotesMarkdown,
} from "./release/release-notes.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runReleaseNotesCli(args, input = {}) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp(input.stdout ?? console.log);
    return 0;
  }

  try {
    const config = readReleaseNotesCliConfig(args);
    const markdown = await (input.createNotes ?? createReleaseNotesFromConfig)(
      config,
    );
    const writeLine = input.stdout ?? console.log;

    if (config.outputPath) {
      await (input.writeNotes ?? writeReleaseNotesMarkdown)(
        config.outputPath,
        markdown,
      );
      writeLine(`Release notes written: ${config.outputPath}`);
    } else {
      writeLine(markdown);
    }

    return 0;
  } catch (error) {
    const writeError = input.stderr ?? console.error;
    writeError(`Release notes generation failed: ${readErrorMessage(error)}`);
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
  pnpm release:notes -- --release-tag v0.1.0 --workflow-run-url https://github.com/owner/repo/actions/runs/123 --smoke-artifact production-smoke-report-123 --release-artifact release-evidence-check-123 --visual-artifact page-builder-visual-fixture-123 --storefront-url https://store.brand.com --rollback-target main@abcdef1 --output docs/releases/v0.1.0.md

Options:
  --allow-blocked             Generate a failure review draft from blocked evidence.
  --output <path>             Write Markdown under docs/releases, artifacts/release, reports/release, tmp/, or .tmp/.
  --release-artifact <name>   Combined release evidence artifact name.
  --release-check <path>      release-evidence-check.v1 JSON path.
  --release-tag <tag>         Release tag or version.
  --rollback-target <value>   Commit, tag, deployment, or version used for rollback.
  --smoke-artifact <name>     Production smoke artifact name.
  --storefront-url <url>      Public production storefront URL.
  --visual-artifact <name>    Page Builder visual fixture artifact name.
  --workflow-run-url <url>    GitHub Actions workflow run URL.
  -h, --help                  Show this help.`);
}

if (isMainModule()) {
  process.exitCode = await runReleaseNotesCli(process.argv.slice(2));
}
