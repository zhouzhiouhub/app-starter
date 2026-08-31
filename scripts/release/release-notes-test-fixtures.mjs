export function createReadySmokeSource() {
  return {
    commitSha: "0123456789abcdef0123456789abcdef01234567",
    repository: "zhouzhiouhub/app-starter",
    runId: "123456789",
    runNumber: "123",
    workflow: "Production Smoke",
    workflowRunUrl:
      "https://github.com/zhouzhiouhub/app-starter/actions/runs/123456789",
  };
}

export function createReadyReleaseArtifact() {
  return {
    blockerCount: 0,
    blockers: [],
    generatedAt: "2026-08-28T00:00:00.000Z",
    readinessChecklist: {
      itemCount: 3,
      items: [
        {
          action: null,
          detail: "Report path: artifacts/production-smoke/smoke-report.json",
          label: "Production Smoke report",
          status: "ready",
        },
        {
          action: null,
          detail: "6/6 components, 12/12 viewports",
          label: "Page Builder Visual evidence",
          status: "ready",
        },
        {
          action:
            "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
          detail: null,
          label: "Release notes record",
          status: "ready to generate",
        },
      ],
      releaseReady: true,
    },
    releaseReady: true,
    schemaVersion: "release-evidence-check.v1",
    smoke: {
      path: "artifacts/production-smoke/smoke-report.json",
      releaseReady: true,
      source: createReadySmokeSource(),
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
      artifactCheck: createCompleteArtifactCheck(),
      checklist: {
        pendingTaskCount: 0,
        pendingTasks: [],
        pendingViewportCount: 0,
        readyViewportCount: 12,
        viewportCount: 12,
      },
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

export function createCompleteArtifactCheck() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    issues: [],
    presentRequiredFileCount: 6,
    presentScreenshotCount: 12,
    referenceImport: createReferenceImportSummary(true),
    requiredFileCount: 6,
    status: "complete",
  };
}

export function createInvalidArtifactCheck() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 1,
    issues: [
      {
        code: "missing_artifact_file",
        component: null,
        message: "capture report is missing.",
        severity: "error",
        viewport: null,
      },
    ],
    presentRequiredFileCount: 5,
    presentScreenshotCount: 0,
    referenceImport: createReferenceImportSummary(false),
    requiredFileCount: 6,
    status: "invalid",
  };
}

export function createVisualIssue() {
  return {
    code: "record_needs_evidence",
    component: "hero-banner",
    message: "hero-banner is needs-evidence.",
    severity: "error",
    viewport: null,
  };
}

function createReferenceImportSummary(complete) {
  return {
    complete,
    manifestPath:
      "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    missingCount: complete ? 0 : 12,
    missingReferences: complete
      ? []
      : ["docs/visual/page-builder-references/hero-banner-desktop.png"],
    requiredReferenceCount: 12,
    requiredReferenceEntryCount: 12,
    requiredReferenceStatusCounts: createRequiredReferenceStatusCounts(complete),
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: complete ? "ready" : "invalid",
    updated: false,
    updateCount: 0,
  };
}

function createRequiredReferenceStatusCounts(complete) {
  return {
    invalid: 0,
    missing: complete ? 0 : 12,
    ready: complete ? 12 : 0,
    updated: 0,
    wouldUpdate: 0,
  };
}
