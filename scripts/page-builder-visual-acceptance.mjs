#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  createPageBuilderVisualAcceptanceArtifact,
  createPageBuilderVisualAcceptanceChecklist,
  formatPageBuilderVisualAcceptanceReport,
  formatPageBuilderVisualAcceptanceChecklist,
  readPageBuilderVisualAcceptanceCliConfig,
  readPageBuilderVisualAcceptanceManifest,
  validatePageBuilderVisualAcceptanceManifest,
  writePageBuilderVisualAcceptanceArtifact,
} from "./visual/page-builder-visual-acceptance.mjs";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";

export async function runPageBuilderVisualAcceptanceCli(args, input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readPageBuilderVisualAcceptanceCliConfig(args);
    const manifest =
      input.manifest ??
      (await readPageBuilderVisualAcceptanceManifest(config.manifestPath));
    const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
      evidenceRoot: input.evidenceRoot,
      requireAccepted: config.requireAccepted,
    });
    const checklist = config.checklist
      ? createPageBuilderVisualAcceptanceChecklist(manifest, {
          evidenceRoot: input.evidenceRoot,
          manifestPath: config.manifestPath,
        })
      : null;
    const artifact = createPageBuilderVisualAcceptanceArtifact(report, {
      checklist,
    });

    if (config.outputPath) {
      await writePageBuilderVisualAcceptanceArtifact(config.outputPath, artifact);
    }

    if (config.json) {
      stdout(JSON.stringify(artifact, null, 2));
    } else {
      for (const line of formatPageBuilderVisualAcceptanceReport(report)) {
        stdout(line);
      }

      if (checklist) {
        for (const line of formatPageBuilderVisualAcceptanceChecklist(
          checklist,
        )) {
          stdout(line);
        }
      }

      if (config.outputPath) {
        stdout(`Visual acceptance artifact written: ${config.outputPath}`);
      }
    }

    return report.status === "invalid" ? 1 : 0;
  } catch (error) {
    stderr(
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

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm visual:acceptance
  pnpm visual:acceptance -- --checklist
  pnpm visual:acceptance -- --require-accepted
  pnpm visual:acceptance -- --json
  pnpm visual:acceptance -- --output reports/visual/page-builder-fixture/visual-acceptance-report.json
  pnpm visual:acceptance -- docs/development/page-builder-visual-acceptance.json

Options:
  --checklist         Print per-section evidence tasks and next commands.
  --json              Print the machine-readable visual acceptance report.
  --output <path>     Write a JSON report under tmp/, reports/, artifacts/, or .tmp/.
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
