#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  assertProjectStatusArtifact,
  createProjectStatusArtifact,
  formatProjectStatusArtifact,
  readProjectStatusCliConfig,
  writeProjectStatusArtifact,
} from "./project/project-status.mjs";
import { readReleaseEvidenceCheck } from "./release/release-check.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runProjectStatusCli(args, input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readProjectStatusCliConfig(args);
    const check = await readReleaseEvidenceCheck(
      config.releaseCheckConfig,
      input,
    );
    const artifact = createProjectStatusArtifact(check, {
      generatedAt: input.generatedAt,
      includeAllActions: config.allActions,
    });

    assertProjectStatusArtifact(artifact);

    if (config.outputPath) {
      await writeProjectStatusArtifact(config.outputPath, artifact);
    }

    if (config.json) {
      stdout(JSON.stringify(artifact, null, 2));
    } else {
      for (const line of formatProjectStatusArtifact(artifact)) {
        stdout(line);
      }

      if (config.outputPath) {
        stdout(`Project status artifact written: ${config.outputPath}`);
      }
    }

    return config.requireReady && !artifact.releaseReady ? 1 : 0;
  } catch (error) {
    stderr(`Project status failed: ${readErrorMessage(error)}`);
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
  pnpm project:status
  pnpm project:status -- --all-actions
  pnpm project:status -- --json
  pnpm project:status -- --require-ready
  pnpm project:status -- --output artifacts/release/project-status.json
  pnpm project:status -- --smoke-report artifacts/production-smoke/smoke-report.json
  pnpm project:status -- --visual-artifact-dir reports/visual/page-builder-fixture

Options:
  --all-actions              Print or write every next action instead of the first 8.
  --json                     Print the machine-readable project status report.
  --output <path>            Write a validated project-status.v1 JSON report under tmp/, reports/, artifacts/, or .tmp/.
  --require-ready            Exit 1 unless the current release gate is ready.
  --smoke-report <path>      Read a specific production smoke report.
  --visual-artifact-dir <dir>
                             Include a downloaded Page Builder Visual artifact.
  --visual-manifest <path>   Read a specific Page Builder visual manifest.
  -h, --help                 Show this help.

Project status:
  This wraps release:check. It summarizes completed MVP milestones, the current
  release gate, and the next concrete actions; --require-ready turns the same
  summary into a completion gate.`);
}

if (isMainModule()) {
  process.exitCode = await runProjectStatusCli(process.argv.slice(2));
}
