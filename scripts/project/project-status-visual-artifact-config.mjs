import { existsSync } from "node:fs";
import path from "node:path";
import { defaultPageBuilderVisualAcceptanceManifestPath } from "../visual/page-builder-visual-acceptance-constants.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check-config.mjs";
import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";

export function applyProjectStatusVisualArtifactDiscovery(config, input = {}) {
  if (
    config.visualArtifactDir ||
    hasCustomVisualManifest(config) ||
    hasInjectedVisualEvidence(input)
  ) {
    return config;
  }

  if (!hasDefaultVisualArtifactFiles()) {
    return config;
  }

  return {
    ...config,
    visualArtifactDir: defaultPageBuilderVisualArtifactDir,
    visualManifestPath: createArtifactPaths(defaultPageBuilderVisualArtifactDir)
      .manifest,
  };
}

function hasCustomVisualManifest(config) {
  return (
    config.visualManifestPath !== defaultPageBuilderVisualAcceptanceManifestPath
  );
}

function hasInjectedVisualEvidence(input) {
  return (
    Object.hasOwn(input, "visualArtifact") ||
    Object.hasOwn(input, "visualManifest")
  );
}

function hasDefaultVisualArtifactFiles() {
  return Object.values(createArtifactPaths(defaultPageBuilderVisualArtifactDir))
    .every((filePath) => existsSync(path.resolve(filePath)));
}
