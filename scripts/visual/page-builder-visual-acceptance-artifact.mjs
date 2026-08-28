import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export function createPageBuilderVisualAcceptanceArtifact(report, input = {}) {
  if (input.checklist) {
    return {
      ...report,
      checklist: input.checklist,
    };
  }

  return report;
}

export async function writePageBuilderVisualAcceptanceArtifact(
  outputPath,
  artifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}
