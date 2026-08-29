import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseProductionEnvironmentMatrix,
  readProductionGithubSourceNames,
} from "./production-environment-docs.mjs";

test("release checklist names GitHub production sources from the matrix", async () => {
  const [runbook, releaseChecklist] = await Promise.all([
    readFile("infra/README.md", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);
  const sourceNames = readProductionGithubSourceNames(
    parseProductionEnvironmentMatrix(runbook),
  );

  for (const sourceName of sourceNames) {
    assert.match(
      releaseChecklist,
      new RegExp(`\`${sourceName}\``),
      `release checklist must name ${sourceName}.`,
    );
  }

  assert.match(releaseChecklist, /optional production secrets/);
  assert.match(releaseChecklist, /remain empty unless Phase 2 Commerce/);
});
