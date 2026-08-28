import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceStatuses,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
import {
  createVisualAcceptanceIssue,
  isObject,
} from "./page-builder-visual-acceptance-targets.mjs";

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

function validateAcceptedViewportEvidence(
  component,
  viewport,
  evidence,
  context,
) {
  let valid = true;

  for (const field of ["designReference", "previewScreenshot"]) {
    if (typeof evidence[field] !== "string" || !evidence[field].trim()) {
      context.issues.push(
        createVisualAcceptanceIssue(
          "error",
          "missing_evidence_path",
          `${component}.${viewport}.${field} is required for accepted evidence.`,
          component,
          viewport,
        ),
      );
      valid = false;
    }
  }

  return [
    validateEvidenceNumber(
      evidence.visualMatchPercent,
      context.targets.minVisualMatchPercent,
      "min",
      `${component}.${viewport}.visualMatchPercent`,
      context,
      component,
      viewport,
    ),
    validateEvidenceNumber(
      evidence.maxLayoutDeltaPx,
      context.targets.maxLayoutDeltaPx,
      "max",
      `${component}.${viewport}.maxLayoutDeltaPx`,
      context,
      component,
      viewport,
    ),
    validateEvidenceNumber(
      evidence.maxColorDeltaE,
      context.targets.maxColorDeltaE,
      "max",
      `${component}.${viewport}.maxColorDeltaE`,
      context,
      component,
      viewport,
    ),
  ].every(Boolean) && valid;
}

function validateEvidenceNumber(
  value,
  threshold,
  mode,
  label,
  context,
  component,
  viewport,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "missing_evidence_metric",
        `${label} must be a finite number for accepted evidence.`,
        component,
        viewport,
      ),
    );
    return false;
  }

  if (mode === "min" ? value < threshold : value > threshold) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "evidence_threshold_failed",
        `${label} (${value}) does not satisfy the target ${mode} ${threshold}.`,
        component,
        viewport,
      ),
    );
    return false;
  }

  return true;
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
