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
