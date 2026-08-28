import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
import {
  isObject,
  readPageBuilderVisualAcceptanceTargets,
} from "./page-builder-visual-acceptance-targets.mjs";

export function createPageBuilderVisualAcceptanceChecklist(manifest) {
  const issues = [];
  const targets = isObject(manifest)
    ? readPageBuilderVisualAcceptanceTargets(manifest, issues)
    : readPageBuilderVisualAcceptanceTargets({}, issues);
  const records = Array.isArray(manifest?.records) ? manifest.records : [];
  const byComponent = new Map(
    records
      .filter((record) => isObject(record) && typeof record.component === "string")
      .map((record) => [record.component, record]),
  );
  const components = mvpPageBuilderComponents.map((component) =>
    createComponentChecklist(component, byComponent.get(component), targets),
  );
  const viewportCount =
    mvpPageBuilderComponents.length * pageBuilderVisualAcceptanceViewports.length;
  const readyViewportCount = components.reduce(
    (count, component) =>
      count + component.viewports.filter((viewport) => viewport.ready).length,
    0,
  );

  return {
    components,
    pendingViewportCount: viewportCount - readyViewportCount,
    readyViewportCount,
    targets,
    viewportCount,
  };
}

export function formatPageBuilderVisualAcceptanceChecklist(checklist) {
  const lines = [
    "Evidence checklist:",
    `  Viewports ready: ${checklist.readyViewportCount}/${checklist.viewportCount}`,
  ];

  for (const component of checklist.components) {
    lines.push(`  - ${component.component}: ${component.status}`);

    for (const viewport of component.viewports) {
      lines.push(formatViewportChecklist(viewport));
    }
  }

  if (checklist.pendingViewportCount > 0) {
    lines.push(
      "Next: attach missing design references, run `pnpm visual:measure -- --write --require-complete`, then review and mark passing evidence accepted.",
    );
  }

  return lines;
}

function createComponentChecklist(component, record, targets) {
  if (!isObject(record)) {
    return {
      component,
      status: "missing",
      viewports: pageBuilderVisualAcceptanceViewports.map((viewport) =>
        createMissingViewportChecklist(component, viewport, targets),
      ),
    };
  }

  return {
    component,
    status: readStatus(record.status),
    viewports: pageBuilderVisualAcceptanceViewports.map((viewport) =>
      createViewportChecklist(
        component,
        viewport,
        record.viewports?.[viewport],
        targets,
      ),
    ),
  };
}

function createMissingViewportChecklist(component, viewport, targets) {
  return {
    component,
    missing: [
      "viewport evidence",
      "designReference",
      "previewScreenshot",
      `visualMatchPercent >= ${targets.minVisualMatchPercent}`,
      `maxLayoutDeltaPx <= ${targets.maxLayoutDeltaPx}`,
      `maxColorDeltaE <= ${targets.maxColorDeltaE}`,
      "status=accepted",
    ],
    ready: false,
    status: "missing",
    viewport,
  };
}

function createViewportChecklist(component, viewport, evidence, targets) {
  if (!isObject(evidence)) {
    return createMissingViewportChecklist(component, viewport, targets);
  }

  const missing = [
    ...collectPathTasks(evidence),
    ...collectMetricTasks(evidence, targets),
    ...collectStatusTasks(evidence),
  ];

  return {
    component,
    missing,
    ready: missing.length === 0,
    status: readStatus(evidence.status),
    viewport,
  };
}

function collectPathTasks(evidence) {
  const tasks = [];

  if (isUnset(evidence.designReference)) {
    tasks.push("designReference");
  }

  if (isUnset(evidence.previewScreenshot)) {
    tasks.push("previewScreenshot");
  }

  return tasks;
}

function collectMetricTasks(evidence, targets) {
  return [
    readMetricTask(
      evidence.visualMatchPercent,
      "min",
      targets.minVisualMatchPercent,
      "visualMatchPercent",
    ),
    readMetricTask(
      evidence.maxLayoutDeltaPx,
      "max",
      targets.maxLayoutDeltaPx,
      "maxLayoutDeltaPx",
    ),
    readMetricTask(
      evidence.maxColorDeltaE,
      "max",
      targets.maxColorDeltaE,
      "maxColorDeltaE",
    ),
  ].filter(Boolean);
}

function collectStatusTasks(evidence) {
  return readStatus(evidence.status) === "accepted" ? [] : ["status=accepted"];
}

function readMetricTask(value, mode, threshold, label) {
  const operator = mode === "min" ? ">=" : "<=";

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return `${label} ${operator} ${threshold}`;
  }

  if (mode === "min" ? value < threshold : value > threshold) {
    return `${label} ${operator} ${threshold} (current ${value})`;
  }

  return null;
}

function readStatus(status) {
  return typeof status === "string" && status ? status : "missing";
}

function formatViewportChecklist(viewport) {
  const label = `    ${viewport.component}.${viewport.viewport}`;

  if (viewport.ready) {
    return `${label}: ready`;
  }

  return `${label}: missing ${viewport.missing.join(", ")}`;
}

function isUnset(value) {
  return value === null || value === undefined || value === "";
}
