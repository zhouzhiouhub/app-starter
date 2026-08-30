import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function writePageBuilderVisualArtifactCheckArtifact(
  outputPath,
  report,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
