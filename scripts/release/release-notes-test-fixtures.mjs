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

export function createCompleteArtifactCheck() {
  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issueCount: 0,
    issues: [],
    presentRequiredFileCount: 3,
    presentScreenshotCount: 12,
    requiredFileCount: 3,
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
    presentRequiredFileCount: 2,
    presentScreenshotCount: 0,
    requiredFileCount: 3,
    status: "invalid",
  };
}
