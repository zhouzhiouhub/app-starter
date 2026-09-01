export function printReleaseRequestFiles(outputPaths, writeLine) {
  writeLine("Release request files refreshed:");
  writeLine(`  - Release evidence: ${outputPaths.releaseEvidence}`);
  writeLine(`  - Page Builder design: ${outputPaths.visualReference}`);
  writeLine(
    `  - Page Builder missing paths: ${outputPaths.visualMissingReferences}`,
  );
  writeLine(`  - Page Builder export table: ${outputPaths.visualReferenceTable}`);
  writeLine(`  - Production Smoke: ${outputPaths.productionSmoke}`);
  writeLine(`  - Production Smoke inputs: ${outputPaths.productionSmokeInputs}`);
  writeLine(
    `  - Production Smoke inputs table: ${outputPaths.productionSmokeInputsTable}`,
  );
}
