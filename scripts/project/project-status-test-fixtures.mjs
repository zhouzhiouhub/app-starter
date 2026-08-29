export function createBlockedCheck() {
  return {
    blockers: [
      {
        action: "Run the Production Smoke workflow.",
        area: "Production Smoke",
        label: "Production smoke artifact missing",
      },
      {
        action:
          "Run pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture to refresh retained fixture evidence.",
        area: "Page Builder Visual",
        label: "Visual acceptance pending",
      },
    ],
    releaseReady: false,
    smoke: {
      groups: [],
      path: null,
      releaseReady: false,
      summary: {
        status: "missing",
      },
    },
    visual: {
      acceptedComponentCount: 0,
      acceptedViewportCount: 0,
      componentCount: 6,
      records: createVisualRecords(),
      status: "needs-evidence",
      viewportCount: 12,
    },
    visualChecklist: createVisualChecklist(),
  };
}

function createVisualRecords() {
  return mvpComponents.map((component) => ({
    accepted: false,
    component,
  }));
}

function createVisualChecklist() {
  const components = mvpComponents.map((component) => ({
    component,
    viewports: [
      createVisualTask(component, "desktop"),
      createVisualTask(component, "mobile"),
    ],
  }));

  return {
    components,
    pendingViewportCount: 12,
    readyViewportCount: 0,
    viewportCount: 12,
  };
}

function createVisualTask(component, viewport) {
  return {
    commands: {
      acceptPassing:
        "pnpm visual:measure -- --write --accept-passing --require-complete",
      importReference:
        "pnpm visual:references -- --source-dir docs/visual/page-builder-references --write --require-complete",
      measure: "pnpm visual:measure -- --write --require-complete",
      referenceReport:
        "pnpm visual:references -- --source-dir docs/visual/page-builder-references --markdown-output artifacts/visual/visual-reference-import-report.md --require-complete",
      verify: "pnpm visual:acceptance -- --require-accepted",
    },
    component,
    expectedDesignReference: `docs/visual/page-builder-references/${component}-${viewport}.png`,
    expectedPreviewScreenshot: `artifacts/visual/page-builder-visual-fixture-${component}-${viewport}.png`,
    ready: false,
    viewport,
  };
}

const mvpComponents = [
  "hero-banner",
  "rich-text",
  "image-gallery",
  "cta-bar",
  "faq",
  "spec-table",
];
