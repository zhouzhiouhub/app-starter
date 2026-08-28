import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseEvidenceReadinessChecklist,
  formatReleaseEvidenceReadinessChecklist,
} from "./release-check.mjs";

test("release readiness checklist summarizes ready evidence", () => {
  const checklist = createReleaseEvidenceReadinessChecklist({
    blockers: [],
    releaseReady: true,
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
    },
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      componentCount: 6,
      status: "accepted",
      viewportCount: 12,
    },
  });
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.equal(checklist.releaseReady, true);
  assert.match(lines, /Production Smoke report: ready/);
  assert.match(lines, /Page Builder Visual evidence: ready/);
  assert.match(lines, /Release notes record: ready to generate/);
});

test("release readiness checklist carries blocker actions", () => {
  const checklist = createReleaseEvidenceReadinessChecklist({
    blockers: [
      {
        action: "Run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "missing",
      },
      {
        action: "Run pnpm visual:acceptance -- --checklist.",
        area: "Page Builder Visual",
        label: "invalid",
      },
    ],
    releaseReady: false,
    smoke: {
      path: null,
      releaseReady: false,
    },
    visual: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      componentCount: 6,
      status: "invalid",
      viewportCount: 12,
    },
  });
  const lines = formatReleaseEvidenceReadinessChecklist(checklist).join("\n");

  assert.equal(checklist.releaseReady, false);
  assert.match(lines, /Run the Production Smoke workflow/);
  assert.match(lines, /Run pnpm visual:acceptance -- --checklist/);
  assert.match(lines, /Release notes record: waiting for evidence/);
});
