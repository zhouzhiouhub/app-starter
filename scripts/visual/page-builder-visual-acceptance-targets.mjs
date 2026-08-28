import {
  defaultPageBuilderVisualAcceptanceTargets,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

export function readPageBuilderVisualAcceptanceTargets(manifest, issues) {
  const targets = isObject(manifest.targets) ? manifest.targets : {};

  validateExactSet(
    targets.components,
    mvpPageBuilderComponents,
    "target_components",
    "targets.components",
    issues,
  );
  validateExactSet(
    targets.viewports,
    pageBuilderVisualAcceptanceViewports,
    "target_viewports",
    "targets.viewports",
    issues,
  );

  return {
    maxColorDeltaE: readTargetNumber(
      targets.maxColorDeltaE,
      defaultPageBuilderVisualAcceptanceTargets.maxColorDeltaE,
      "targets.maxColorDeltaE",
      issues,
    ),
    maxLayoutDeltaPx: readTargetNumber(
      targets.maxLayoutDeltaPx,
      defaultPageBuilderVisualAcceptanceTargets.maxLayoutDeltaPx,
      "targets.maxLayoutDeltaPx",
      issues,
    ),
    minVisualMatchPercent: readTargetNumber(
      targets.minVisualMatchPercent,
      defaultPageBuilderVisualAcceptanceTargets.minVisualMatchPercent,
      "targets.minVisualMatchPercent",
      issues,
    ),
  };
}

export function createVisualAcceptanceIssue(
  severity,
  code,
  message,
  component,
  viewport,
) {
  return { code, component, message, severity, viewport };
}

export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTargetNumber(value, fallback, label, issues) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  issues.push(
    createVisualAcceptanceIssue(
      "error",
      "invalid_target",
      `${label} must be a positive number.`,
    ),
  );
  return fallback;
}

function validateExactSet(value, expected, code, label, issues) {
  const actual = Array.isArray(value) ? value : [];

  if (
    actual.length === expected.length &&
    expected.every((item) => actual.includes(item))
  ) {
    return;
  }

  issues.push(
    createVisualAcceptanceIssue(
      "error",
      code,
      `${label} must exactly cover: ${expected.join(", ")}.`,
    ),
  );
}
