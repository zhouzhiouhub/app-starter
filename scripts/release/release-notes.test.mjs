import assert from "node:assert/strict";
import test from "node:test";
import {
  createReleaseNotesMarkdown,
  readReleaseNotesCliConfig,
} from "./release-notes.mjs";
import { assertReleaseEvidenceCheckArtifact } from "./release-notes-artifact.mjs";

test("release notes config parses required release evidence fields", () => {
  assert.deepEqual(
    readReleaseNotesCliConfig([
      "--",
      "--release-tag",
      "v0.1.0",
      "--workflow-run-url",
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123",
      "--smoke-artifact",
      "production-smoke-report-123",
      "--release-artifact",
      "release-evidence-check-123",
      "--visual-artifact",
      "page-builder-visual-fixture-123",
      "--storefront-url",
      "https://store.brand.com",
      "--rollback-target",
      "main@abcdef1",
      "--release-check",
      "artifacts/release/release-check.json",
      "--output",
      "docs/releases/v0.1.0.md",
    ]),
    {
      allowBlocked: false,
      outputPath: "docs/releases/v0.1.0.md",
      releaseArtifact: "release-evidence-check-123",
      releaseCheckPath: "artifacts/release/release-check.json",
      releaseTag: "v0.1.0",
      rollbackTarget: "main@abcdef1",
      smokeArtifact: "production-smoke-report-123",
      storefrontUrl: "https://store.brand.com/",
      visualArtifact: "page-builder-visual-fixture-123",
      workflowRunUrl:
        "https://github.com/zhouzhiouhub/app-starter/actions/runs/123",
    },
  );
});

test("release notes config rejects unsafe release record values", () => {
  assert.throws(
    () => readReleaseNotesCliConfig(["--release-tag", "v0.1.0"]),
    /Release artifact is required/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--workflow-run-url",
        "https://example.com/actions/runs/123",
      ]),
    /Workflow run URL must be a GitHub Actions run URL/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--storefront-url",
        "https://example.com",
      ]),
    /Storefront URL must use a real production HTTPS host/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--smoke-artifact",
        "production smoke",
      ]),
    /Smoke artifact must use 1-160 safe characters/,
  );
  assert.throws(
    () =>
      readReleaseNotesCliConfig([
        ...createRequiredArgs(),
        "--output",
        "README.md",
      ]),
    /Release notes output must use safe path segments/,
  );
});

test("release notes validates release evidence artifact shape", () => {
  const artifact = createReadyReleaseArtifact();

  assert.doesNotThrow(() => assertReleaseEvidenceCheckArtifact(artifact));
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: { ...artifact.smoke, summary: null },
      }),
    /smoke\.summary must be an object/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          acceptedViewportCount: artifact.visual.viewportCount + 1,
        },
      }),
    /visual\.acceptedViewportCount must not exceed visual\.viewportCount/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        blockers: [null],
      }),
    /blockers must contain objects/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: { ...artifact.visual, pendingComponents: ["hero-banner", 42] },
      }),
    /visual\.pendingComponents must be a string array/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        blockers: [
          {
            action: "Fix smoke evidence.",
            area: "Production Smoke",
            label: "Blocked",
          },
        ],
        blockerCount: 1,
      }),
    /ready evidence must have no blockers/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        smoke: {
          ...artifact.smoke,
          summary: { ...artifact.smoke.summary, failedCheckCount: 1 },
        },
      }),
    /ready evidence must include ready production smoke/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        visual: {
          ...artifact.visual,
          acceptedViewportCount: artifact.visual.viewportCount - 1,
        },
      }),
    /ready evidence must include accepted visual evidence/,
  );
  assert.throws(
    () =>
      assertReleaseEvidenceCheckArtifact({
        ...artifact,
        blockerCount: 0,
        releaseReady: false,
        status: "blocked",
        blockers: [
          {
            action: "Fix smoke evidence.",
            area: "Production Smoke",
            label: "Blocked",
          },
        ],
      }),
    /blockerCount must cover serialized blockers/,
  );
});

test("release notes render required evidence and gate status", () => {
  const markdown = createReleaseNotesMarkdown(
    createReleaseNotesConfig(),
    createReadyReleaseArtifact(),
  );

  assert.match(markdown, /^# Release v0\.1\.0/m);
  assert.match(markdown, /Status: ready/);
  assert.match(markdown, /Production smoke artifact: `production-smoke-report-123`/);
  assert.match(markdown, /Combined release artifact: `release-evidence-check-123`/);
  assert.match(markdown, /Page Builder Visual: accepted \(6\/6 components, 12\/12 viewports\)/);
  assert.match(
    markdown,
    /Manifest: `docs\/development\/page-builder-visual-acceptance\.json`/,
  );
  assert.match(markdown, /Pending components: none/);
  assert.match(markdown, /Pending viewports: none/);
  assert.match(markdown, /Visual issues: none/);
  assert.match(markdown, /Rollback target: `main@abcdef1`/);
  assert.match(markdown, /- None/);
});

function createReadyReleaseArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    releaseReady: true,
    schemaVersion: "release-evidence-check.v1",
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
      status: "ready",
      summary: {
        checkCount: 42,
        failedCheckCount: 0,
        productionReady: true,
        status: "passed",
      },
      traceability: [
        {
          action: "R2/CDN traceability passed.",
          label: "R2/CDN",
          status: "passed",
        },
      ],
    },
    status: "ready",
    visual: {
      acceptedComponentCount: 6,
      acceptedViewportCount: 12,
      componentCount: 6,
      errorCount: 0,
      issueCount: 0,
      issues: [],
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      pendingComponents: [],
      pendingViewports: [],
      status: "accepted",
      viewportCount: 12,
      warningCount: 0,
    },
  };
}

test("release notes require ready evidence unless explicitly allowed", () => {
  const artifact = {
    blockerCount: 1,
    blockers: [
      {
        action: "Attach design references.",
        area: "Page Builder Visual",
        label: "Visual acceptance invalid",
      },
    ],
    generatedAt: "2026-08-28T00:00:00.000Z",
    releaseReady: false,
    schemaVersion: "release-evidence-check.v1",
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
      status: "ready",
      summary: {
        checkCount: 42,
        failedCheckCount: 0,
        productionReady: true,
        status: "passed",
      },
      traceability: [],
    },
    status: "blocked",
    visual: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      componentCount: 6,
      errorCount: 1,
      issueCount: 1,
      issues: [
        {
          code: "record_needs_evidence",
          component: "hero-banner",
          message: "hero-banner is needs-evidence.",
          severity: "error",
          viewport: null,
        },
      ],
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      pendingComponents: ["hero-banner", "rich-text"],
      pendingViewports: ["hero-banner.desktop", "hero-banner.mobile"],
      status: "invalid",
      viewportCount: 12,
      warningCount: 0,
    },
  };

  assert.throws(
    () => createReleaseNotesMarkdown(createReleaseNotesConfig(), artifact),
    /Release notes require a ready release-evidence-check\.v1 artifact/,
  );

  const markdown = createReleaseNotesMarkdown(
    { ...createReleaseNotesConfig(), allowBlocked: true },
    artifact,
  );

  assert.match(markdown, /Status: blocked/);
  assert.match(markdown, /Page Builder Visual: Visual acceptance invalid/);
  assert.match(markdown, /Pending components: hero-banner, rich-text/);
  assert.match(
    markdown,
    /Pending viewports: hero-banner\.desktop, hero-banner\.mobile/,
  );
  assert.match(
    markdown,
    /Visual issue: hero-banner: record_needs_evidence \(error\) - hero-banner is needs-evidence\./,
  );
});

test("release notes command is exposed in package, CI, and release docs", async () => {
  const [packageJson, ciWorkflow, releaseChecklist] = await Promise.all([
    readText("package.json"),
    readText(".github/workflows/ci.yml"),
    readText("docs/development/release-checklist.md"),
  ]);

  assert.match(
    packageJson,
    /"release:notes": "node scripts\/release-notes\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:notes -- --help/);
  assert.match(releaseChecklist, /pnpm release:notes/);
});

function createRequiredArgs() {
  return [
    "--release-tag",
    "v0.1.0",
    "--workflow-run-url",
    "https://github.com/zhouzhiouhub/app-starter/actions/runs/123",
    "--smoke-artifact",
    "production-smoke-report-123",
    "--release-artifact",
    "release-evidence-check-123",
    "--visual-artifact",
    "page-builder-visual-fixture-123",
    "--storefront-url",
    "https://store.brand.com",
    "--rollback-target",
    "main@abcdef1",
  ];
}

function createReleaseNotesConfig() {
  return readReleaseNotesCliConfig(createRequiredArgs());
}

async function readText(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}
