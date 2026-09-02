import {
  readOptionValue,
  setValueOption,
} from "./release-cli-options.mjs";

const releaseRequestsManifestOptions = new Set([
  "--requests-manifest-output",
  "--release-requests-manifest-output",
  "--bundle-manifest-output",
]);

export function readReleaseRequestsOutputOption(
  config,
  option,
  args,
  index,
  value,
) {
  if (option === "--release-output") {
    const outputPath = readOptionValue(option, args, index, value);
    setValueOption(config.releaseEvidenceArgs, "--output", outputPath);
    config.outputPaths.releaseEvidence = outputPath;
    return true;
  }

  if (releaseRequestsManifestOptions.has(option)) {
    const outputPath = readOptionValue(option, args, index, value);
    setValueOption(
      config.releaseEvidenceArgs,
      "--requests-manifest-output",
      outputPath,
    );
    config.outputPaths.releaseRequestsManifest = outputPath;
    return true;
  }

  return false;
}
