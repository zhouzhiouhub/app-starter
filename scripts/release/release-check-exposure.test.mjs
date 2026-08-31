import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("release check command is exposed in package, CI, and release docs", async () => {
  const [packageJson, ciWorkflow, releaseChecklist] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(
    packageJson,
    /"release:check": "node scripts\/release-check\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:check -- --help/);
  assert.match(
    releaseChecklist,
    /pnpm release:check -- --smoke-report artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(
    releaseChecklist,
    /--markdown-output artifacts\/release\/release-check\.md/,
  );
  assert.match(
    releaseChecklist,
    /--visual-artifact-dir reports\/visual\/page-builder-fixture/,
  );
  assert.match(
    releaseChecklist,
    /--output artifacts\/release\/release-check\.json/,
  );
  assert.match(releaseChecklist, /release-evidence-check\.v1/);
});
