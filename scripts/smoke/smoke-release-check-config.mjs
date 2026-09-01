import {
  discoverSmokeReportArtifacts,
  readSmokeReportArtifact,
} from "./smoke-report-archive.mjs";

export function readSmokeReleaseCheckCliConfig(args) {
  const config = { reportPath: null };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--" || arg === "--latest") {
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown smoke release check option: ${arg}`);
    }

    if (config.reportPath) {
      throw new Error("Provide only one smoke report path.");
    }

    config.reportPath = arg;
  }

  return config;
}

export async function readSmokeReleaseCheckArtifact(config) {
  if (config?.reportPath) {
    return readSmokeReportArtifact(config.reportPath);
  }

  const artifacts = await discoverSmokeReportArtifacts({
    limit: 1,
    roots: config?.roots,
  });

  if (artifacts.length === 0) {
    throw new Error(
      "No smoke reports found. Run pnpm smoke:request, validate workflow_dispatch inputs with pnpm smoke:dispatch -- --require-complete, then run the Production Smoke workflow and keep production-smoke-report-<run_number>, or run SMOKE_REPORT_PATH=artifacts/production-smoke/smoke-report.json pnpm smoke:publish for a local archived report.",
    );
  }

  return artifacts[0];
}
