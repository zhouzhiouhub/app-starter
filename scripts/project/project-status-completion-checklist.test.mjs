import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import { createReleaseEvidenceCheck } from "../release/release-check.mjs";
import {
  createAcceptedVisualManifest,
  createCompleteReleaseReport,
  createVisualArtifactCheck,
} from "../release/release-check-test-fixtures.mjs";
import {
  assertProjectStatusArtifact,
  createProjectStatusArtifact,
  createProjectStatusMarkdown,
  formatProjectStatusArtifact,
} from "./project-status.mjs";
import { createBlockedCheck } from "./project-status-test-fixtures.mjs";

test("project status completion checklist summarizes blocked evidence", () => {
  const check = createBlockedCheck();
  check.visualArtifact = createVisualArtifactCheck({ status: "complete" });
  const artifact = createProjectStatusArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });
  const checklist = artifact.completionChecklist;
  const terminalText = formatProjectStatusArtifact(artifact).join("\n");
  const markdown = createProjectStatusMarkdown(artifact);

  assert.equal(checklist.itemCount, 4);
  assert.equal(checklist.completeCount, 2);
  assert.equal(checklist.needsEvidenceCount, 2);
  assert.deepEqual(
    checklist.items.map((item) => [item.label, item.status]),
    [
      ["Local MVP implementation scope", "complete"],
      ["Production Smoke release evidence", "needs-evidence"],
      ["Page Builder visual acceptance evidence", "needs-evidence"],
      ["Page Builder visual artifact bundle", "complete"],
    ],
  );
  assert.match(
    checklist.items[1].nextAction,
    /Run the Production Smoke workflow/u,
  );
  assert.deepEqual(
    checklist.items[1].nextSteps.map((step) => step.label),
    [
      "Run workflow",
      "Local verification inputs",
      "Visual evidence inputs",
      "Release note inputs",
      "Keep artifacts",
      "Rerun gate",
    ],
  );
  assert.equal(
    checklist.items[1].nextSteps.at(-1).value,
    "pnpm release:check -- --smoke-report <path> --visual-artifact-dir reports/visual/page-builder-fixture",
  );
  assert.match(
    checklist.items[2].evidence,
    /12 Page Builder visual viewport tasks still need accepted evidence/u,
  );
  assert.match(
    checklist.items[3].evidence,
    /0 issues, 6\/6 files, 12\/12 screenshots, 12\/12 design references, references ready \(0 missing, 0 updates\)/u,
  );
  assert.equal(
    checklist.items[2].nextSteps.find(
      (step) => step.label === "Reference report",
    ).value,
    "pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete",
  );
  assert.match(terminalText, /Completion checklist:/);
  assert.match(
    terminalText,
    /Production Smoke release evidence: needs-evidence/u,
  );
  assert.match(terminalText, /Next steps:/u);
  assert.match(markdown, /## Completion Checklist/);
  assert.match(markdown, /Complete: 2\/4/);
  assert.match(markdown, /Needs evidence: 2\/4/);
  assert.match(
    markdown,
    /Reference report: `pnpm visual:references -- --source-dir docs\/visual\/page-builder-references --manifest reports\/visual\/page-builder-fixture\/page-builder-visual-acceptance\.json --output reports\/visual\/page-builder-fixture\/visual-reference-import-report\.json --markdown-output reports\/visual\/page-builder-fixture\/visual-reference-import-report\.md --require-complete`/u,
  );
});

test("project status completion checklist is complete when release evidence is ready", async () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();

  try {
    const check = createReleaseEvidenceCheck({
      smokeArtifact: {
        path: "artifacts/production-smoke/smoke-report.json",
        report: createCompleteReleaseReport(),
      },
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualArtifact: createVisualArtifactCheck({ status: "complete" }),
      visualArtifactDir: "reports/visual/page-builder-fixture",
      visualEvidenceRoot: evidenceRoot,
      visualManifest: manifest,
      visualManifestPath: "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    });
    const artifact = createProjectStatusArtifact(check, {
      generatedAt: "2026-08-28T00:00:00.000Z",
    });

    assert.equal(artifact.releaseReady, true);
    assert.equal(artifact.completionChecklist.itemCount, 4);
    assert.equal(artifact.completionChecklist.completeCount, 4);
    assert.equal(artifact.completionChecklist.needsEvidenceCount, 0);
    assert.equal(
      artifact.completionChecklist.items.every(
        (item) =>
          item.status === "complete" &&
          item.nextAction === null &&
          item.nextSteps.length === 0,
      ),
      true,
    );
  } finally {
    await rm(evidenceRoot, { force: true, recursive: true });
  }
});

test("project status validation rejects stale completion checklist data", () => {
  const artifact = createProjectStatusArtifact(createBlockedCheck(), {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...artifact,
        completionChecklist: {
          ...artifact.completionChecklist,
          completeCount: artifact.completionChecklist.completeCount + 1,
        },
      }),
    /completionChecklist\.completeCount must match complete items/u,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...artifact,
        completionChecklist: {
          ...artifact.completionChecklist,
          items: artifact.completionChecklist.items.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  status: "ready",
                }
              : item,
          ),
        },
      }),
    /completionChecklist\.items\.status/u,
  );

  assert.throws(
    () =>
      assertProjectStatusArtifact({
        ...artifact,
        completionChecklist: {
          ...artifact.completionChecklist,
          items: artifact.completionChecklist.items.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  nextSteps: [{ label: "Run workflow" }],
                }
              : item,
          ),
        },
      }),
    /completionChecklist\.items\.nextSteps\.value/u,
  );
});
