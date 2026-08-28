import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceStatuses,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
import {
  createVisualAcceptanceIssue,
  isObject,
} from "./page-builder-visual-acceptance-targets.mjs";
import {
  validateAcceptedViewportEvidence,
  validateProvidedViewportEvidencePaths,
} from "./page-builder-visual-acceptance-viewport-evidence.mjs";

export function summarizePageBuilderVisualAcceptanceRecords(
  manifest,
  context,
) {
  const records = readVisualAcceptanceRecords(manifest, context.issues);

  return mvpPageBuilderComponents.map((component) =>
    summarizeRecord(component, records.byComponent.get(component), context),
  );
}

function readVisualAcceptanceRecords(manifest, issues) {
  const records = Array.isArray(manifest.records) ? manifest.records : [];
  const byComponent = new Map();

  if (!Array.isArray(manifest.records)) {
    issues.push(
      createVisualAcceptanceIssue(
        "error",
        "invalid_records",
        "records must be an array of MVP section acceptance records.",
      ),
    );
  }

  for (const record of records) {
    addVisualAcceptanceRecord(record, byComponent, issues);
  }

  return { byComponent };
}

function addVisualAcceptanceRecord(record, byComponent, issues) {
  if (!isObject(record) || typeof record.component !== "string") {
    issues.push(
      createVisualAcceptanceIssue(
        "error",
        "invalid_record",
        "Each visual acceptance record must include a component string.",
      ),
    );
    return;
  }

  if (!mvpPageBuilderComponents.includes(record.component)) {
    issues.push(
      createVisualAcceptanceIssue(
        "error",
        "unknown_component",
        `Unknown visual acceptance component: ${record.component}.`,
        record.component,
      ),
    );
    return;
  }

  if (byComponent.has(record.component)) {
    issues.push(
      createVisualAcceptanceIssue(
        "error",
        "duplicate_component",
        `Duplicate visual acceptance record: ${record.component}.`,
        record.component,
      ),
    );
    return;
  }

  byComponent.set(record.component, record);
}

function summarizeRecord(component, record, context) {
  if (!record) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "missing_component",
        `Missing visual acceptance record: ${component}.`,
        component,
      ),
    );
    return createRecordSummary(component, false, 0, "missing");
  }

  const status = readRecordStatus(record, component, context.issues);
  const viewportSummaries = pageBuilderVisualAcceptanceViewports.map((viewport) =>
    summarizeViewport(component, viewport, record, context),
  );
  const acceptedViewportCount = viewportSummaries.filter(
    (summary) => summary.accepted,
  ).length;
  const accepted =
    status === "accepted" &&
    acceptedViewportCount === pageBuilderVisualAcceptanceViewports.length;

  addRecordStatusIssue(component, status, accepted, context);

  return createRecordSummary(
    component,
    accepted,
    acceptedViewportCount,
    status,
  );
}

function summarizeViewport(component, viewport, record, context) {
  const viewportRecord = record.viewports?.[viewport];

  if (!isObject(viewportRecord)) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "missing_viewport",
        `${component} is missing ${viewport} visual evidence.`,
        component,
        viewport,
      ),
    );
    return { accepted: false, status: "missing", viewport };
  }

  const status = readRecordStatus(
    viewportRecord,
    `${component}.${viewport}`,
    context.issues,
  );

  if (status !== "accepted") {
    validateProvidedViewportEvidencePaths(
      component,
      viewport,
      viewportRecord,
      context,
    );
  }

  const accepted =
    status === "accepted" &&
    validateAcceptedViewportEvidence(
      component,
      viewport,
      viewportRecord,
      context,
    );

  return { accepted, status, viewport };
}

function addRecordStatusIssue(component, status, accepted, context) {
  if (status !== "accepted") {
    context.issues.push(
      createVisualAcceptanceIssue(
        context.requireAccepted ? "error" : "warning",
        "record_needs_evidence",
        `${component} is ${status}; attach design references and browser screenshots before release sign-off.`,
        component,
      ),
    );
  }

  if (status === "accepted" && !accepted) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "record_viewports_not_accepted",
        `${component} is marked accepted but not every viewport has accepted evidence.`,
        component,
      ),
    );
  }
}

function readRecordStatus(record, label, issues) {
  if (!pageBuilderVisualAcceptanceStatuses.has(record.status)) {
    issues.push(
      createVisualAcceptanceIssue(
        "error",
        "invalid_status",
        `${label} status must be accepted, blocked, or needs-evidence.`,
      ),
    );
    return "invalid";
  }

  return record.status;
}

function createRecordSummary(component, accepted, acceptedViewportCount, status) {
  return { accepted, acceptedViewportCount, component, status };
}
