#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  createReleaseEvidenceCheckArtifact,
  createReleaseEvidenceReadinessChecklist,
  formatReleaseEvidenceCheck,
  formatReleaseEvidenceReadinessChecklist,
  readReleaseCheckCliConfig,
  readReleaseEvidenceCheck,
  writeReleaseEvidenceCheckArtifact,
} from "./release/release-check.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runReleaseCheckCli(args, input = {}) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp(input.stdout ?? console.log);
    return 0;
  }

  try {
    const config = readReleaseCheckCliConfig(args);
    const check = await readReleaseEvidenceCheck(config, input);
    const artifact = createReleaseEvidenceCheckArtifact(check);
    const writeLine = input.stdout ?? console.log;

    if (config.outputPath) {
      await writeReleaseEvidenceCheckArtifact(config.outputPath, artifact);
    }

    if (config.json) {
      writeLine(JSON.stringify(artifact, null, 2));
    } else {
      for (const line of formatReleaseEvidenceCheck(check)) {
        writeLine(line);
      }

      if (config.checklist) {
        const checklist = createReleaseEvidenceReadinessChecklist(check, {
          includeAllVisualTasks: config.allVisualTasks,
        });

        for (const line of formatReleaseEvidenceReadinessChecklist(checklist)) {
          writeLine(line);
        }
      }

      if (config.outputPath) {
        writeLine(`Release evidence artifact written: ${config.outputPath}`);
      }
    }

    return check.releaseReady ? 0 : 1;
  } catch (error) {
    const writeError = input.stderr ?? console.error;
    writeError(`Release evidence check failed: ${readErrorMessage(error)}`);
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
  pnpm release:check
  pnpm release:check -- --checklist
  pnpm release:check -- --checklist --all-visual-tasks
  pnpm release:check -- --smoke-report artifacts/production-smoke/smoke-report.json
  pnpm release:check -- --visual-artifact-dir reports/visual/page-builder-fixture
  pnpm release:check -- --json
  pnpm release:check -- --output artifacts/release/release-check.json
  pnpm release:check -- artifacts/production-smoke/smoke-report.json

Options:
  --all-visual-tasks        Show every Page Builder visual task with --checklist.
  --latest                   Check the newest archived smoke report (default).
  --checklist                Print release evidence readiness tasks.
  --json                     Print the machine-readable release evidence report.
  --output <path>            Write a JSON report under tmp/, reports/, artifacts/, or .tmp/.
  --smoke-report <path>      Check a specific production smoke report.
  --visual-artifact-dir <dir>
                             Check a downloaded Page Builder Visual artifact.
  --visual-manifest <path>   Check a specific Page Builder visual manifest.
  -h, --help                 Show this help.

Release evidence:
  The gate passes only when production smoke evidence is release-ready and
  Page Builder visual acceptance is fully accepted with retained evidence.`);
}

if (isMainModule()) {
  process.exitCode = await runReleaseCheckCli(process.argv.slice(2));
}
