import { readFile } from "node:fs/promises";
import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";

export async function readPageBuilderVisualAcceptanceManifest(
  manifestPath = defaultPageBuilderVisualAcceptanceManifestPath,
) {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}
