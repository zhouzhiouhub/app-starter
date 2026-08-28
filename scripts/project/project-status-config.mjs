import { readReleaseCheckCliConfig } from "../release/release-check-config.mjs";

export function readProjectStatusCliConfig(args) {
  const releaseCheckConfig = readReleaseCheckCliConfig(args);

  return {
    json: releaseCheckConfig.json,
    outputPath: releaseCheckConfig.outputPath,
    releaseCheckConfig,
  };
}
