import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

const requiredReferenceStatuses = new Set([
  "missing",
  "ready",
  "updated",
  "would-update",
]);
const requiredReferenceStatusFields = {
  missing: "missing",
  ready: "ready",
  updated: "updated",
  "would-update": "wouldUpdate",
};
const requiredReferenceKeys = new Set(
  mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) =>
      createReferenceKey(component, viewport),
    ),
  ),
);

export function hasRequiredReferenceList(report) {
  return (
    report?.requiredReferenceCount !== undefined ||
    report?.requiredReferences !== undefined
  );
}

export function isValidRequiredReferenceList(report) {
  if (!hasRequiredReferenceList(report)) {
    return true;
  }

  return (
    Array.isArray(report.requiredReferences) &&
    report.requiredReferenceCount === report.requiredReferences.length &&
    report.requiredReferenceCount === requiredReferenceKeys.size &&
    hasEveryRequiredReference(report.requiredReferences) &&
    !hasDuplicateReferenceKeys(report.requiredReferences) &&
    report.requiredReferences.every((item) =>
      isValidRequiredReferenceEntry(item, report),
    )
  );
}

export function createRequiredReferenceSummaryFields(report) {
  if (!hasRequiredReferenceList(report)) {
    return {};
  }

  const requiredReferences = Array.isArray(report.requiredReferences)
    ? report.requiredReferences
    : [];

  return {
    requiredReferenceCount:
      readNonNegativeCount(report.requiredReferenceCount) ??
      requiredReferences.length,
    requiredReferenceEntryCount: requiredReferences.length,
    requiredReferenceStatusCounts:
      countRequiredReferenceStatuses(requiredReferences),
  };
}

function isValidRequiredReferenceEntry(item, report) {
  if (
    !isObject(item) ||
    !isNonEmptyString(report.sourceDir) ||
    !isKnownReferenceKey(item) ||
    !requiredReferenceStatuses.has(item.status) ||
    item.expectedPath !== createExpectedReferencePath(report.sourceDir, item)
  ) {
    return false;
  }

  const missing = findReferenceEntry(report.missing, item);
  const update = findReferenceEntry(report.updates, item);

  if (missing) {
    return item.status === "missing" && item.reason === missing.reason;
  }

  if (update) {
    return (
      item.status === readUpdateStatus(report) &&
      item.designReference === update.designReference
    );
  }

  return item.status === "ready";
}

function countRequiredReferenceStatuses(items) {
  const counts = createEmptyRequiredReferenceStatusCounts();

  for (const item of items) {
    const field = isObject(item)
      ? requiredReferenceStatusFields[item.status]
      : null;

    if (field) {
      counts[field] += 1;
    } else {
      counts.invalid += 1;
    }
  }

  return counts;
}

function createEmptyRequiredReferenceStatusCounts() {
  return {
    invalid: 0,
    missing: 0,
    ready: 0,
    updated: 0,
    wouldUpdate: 0,
  };
}

function hasEveryRequiredReference(items) {
  const keys = new Set(items.map(readReferenceKey).filter(Boolean));

  return Array.from(requiredReferenceKeys).every((key) => keys.has(key));
}

function hasDuplicateReferenceKeys(items) {
  const seen = new Set();

  for (const item of items) {
    const key = readReferenceKey(item);

    if (!key) {
      continue;
    }

    if (seen.has(key)) {
      return true;
    }

    seen.add(key);
  }

  return false;
}

function findReferenceEntry(items, target) {
  if (!Array.isArray(items)) {
    return null;
  }

  return (
    items.find(
      (item) =>
        item.component === target.component && item.viewport === target.viewport,
    ) ?? null
  );
}

function readUpdateStatus(report) {
  return report.status === "updated" || report.updated === true
    ? "updated"
    : "would-update";
}

function isKnownReferenceKey(item) {
  return (
    isNonEmptyString(item.component) &&
    isNonEmptyString(item.viewport) &&
    requiredReferenceKeys.has(createReferenceKey(item.component, item.viewport))
  );
}

function readReferenceKey(item) {
  return isObject(item) &&
    isNonEmptyString(item.component) &&
    isNonEmptyString(item.viewport)
    ? createReferenceKey(item.component, item.viewport)
    : null;
}

function createExpectedReferencePath(sourceDir, item) {
  return `${sourceDir}/${item.component}-${item.viewport}.png`;
}

function createReferenceKey(component, viewport) {
  return `${component}.${viewport}`;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function readNonNegativeCount(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
