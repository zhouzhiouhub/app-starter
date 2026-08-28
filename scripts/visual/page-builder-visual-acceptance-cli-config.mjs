import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";

export function readPageBuilderVisualAcceptanceCliConfig(args) {
  const config = {
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    requireAccepted: false,
  };

  for (const arg of args) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--require-accepted") {
      config.requireAccepted = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown visual acceptance option: ${arg}`);
    }

    if (config.manifestPath !== defaultPageBuilderVisualAcceptanceManifestPath) {
      throw new Error("Provide only one visual acceptance manifest path.");
    }

    config.manifestPath = arg;
  }

  return config;
}
