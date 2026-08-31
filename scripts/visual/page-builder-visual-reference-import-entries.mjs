import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

const requiredReferenceKeys = new Set(
  mvpPageBuilderComponents.flatMap((component) =>
    pageBuilderVisualAcceptanceViewports.map((viewport) =>
      createReferenceKey(component, viewport),
    ),
  ),
);

export function hasDuplicateReferenceKeys(items) {
  if (!Array.isArray(items)) {
    return false;
  }

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

export function hasOverlappingReferenceKeys(leftItems, rightItems) {
  if (!Array.isArray(leftItems) || !Array.isArray(rightItems)) {
    return false;
  }

  const leftKeys = new Set(leftItems.map(readReferenceKey).filter(Boolean));

  return rightItems
    .map(readReferenceKey)
    .filter(Boolean)
    .some((key) => leftKeys.has(key));
}

export function isValidMissingReferenceEntry(item, sourceDir) {
  if (
    !isObject(item) ||
    !isNonEmptyString(sourceDir) ||
    !isNonEmptyString(item.component) ||
    !isNonEmptyString(item.viewport) ||
    !isNonEmptyString(item.reason)
  ) {
    return false;
  }

  return (
    isKnownReferenceKey(item) &&
    item.expectedPath === `${sourceDir}/${item.component}-${item.viewport}.png`
  );
}

export function isValidUpdateReferenceEntry(item, sourceDir) {
  if (
    !isObject(item) ||
    !isNonEmptyString(sourceDir) ||
    !isNonEmptyString(item.component) ||
    !isNonEmptyString(item.viewport) ||
    !isNonEmptyString(item.designReference)
  ) {
    return false;
  }

  return (
    isKnownReferenceKey(item) &&
    item.designReference ===
      `${sourceDir}/${item.component}-${item.viewport}.png`
  );
}

function isKnownReferenceKey(item) {
  return requiredReferenceKeys.has(
    createReferenceKey(item.component, item.viewport),
  );
}

function readReferenceKey(item) {
  return isObject(item) &&
    isNonEmptyString(item.component) &&
    isNonEmptyString(item.viewport)
    ? createReferenceKey(item.component, item.viewport)
    : null;
}

function createReferenceKey(component, viewport) {
  return `${component}.${viewport}`;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}
