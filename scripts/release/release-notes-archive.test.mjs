import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("release records directory documents final sign-off evidence", () => {
  const readmePath = "docs/releases/README.md";

  assert.equal(existsSync(readmePath), true);

  const readme = readFileSync(readmePath, "utf8");

  assert.match(readme, /release-evidence-check\.v1/);
  assert.match(readme, /pnpm release:notes/);
  assert.match(readme, /--output docs\/releases\/v0\.1\.0\.md/);
  assert.match(readme, /production-smoke-report-<run_number>/);
  assert.match(readme, /release-preflight-<run_number>/);
  assert.match(readme, /release-evidence-check-<run_number>/);
  assert.match(readme, /project-status-<run_number>/);
  assert.match(
    readme,
    /--project-status artifacts\/release\/project-status\.json/,
  );
  assert.match(readme, /--preflight-artifact release-preflight-123/);
  assert.match(readme, /--project-status-artifact project-status-123/);
  assert.match(readme, /page-builder-visual-fixture-<run_number>/);
  assert.match(readme, /Failure review drafts may use `--allow-blocked`/);
  assert.match(readme, /Project Next Actions/);
  assert.match(readme, /validated\s+project status artifact/);
});

test("release checklist points final records at docs releases", () => {
  const releaseChecklist = readFileSync(
    "docs/development/release-checklist.md",
    "utf8",
  );

  assert.match(releaseChecklist, /--output docs\/releases\/<tag>\.md/);
  assert.match(
    releaseChecklist,
    /Keep the generated `docs\/releases\/<tag>\.md` release record/,
  );
  assert.match(releaseChecklist, /Project Next Actions/);
  assert.match(releaseChecklist, /failed run/);
});
