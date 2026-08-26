import { formatSmokeText } from "./smoke-text.mjs";

const maxActionLineLength = 300;
const maxContextItemCount = 6;
const maxContextValueLength = 96;
const maxIssueAreaLength = 96;
const maxIssueCodeLength = 80;
const maxIssueLineLength = 360;
const maxIssueMessageLength = 220;

export function printSmokeProductionReadiness(readiness, writer = console) {
  const lines = formatSmokeProductionReadiness(readiness);
  const write =
    readiness?.productionReady === true
      ? (writer.log ?? writer.warn)
      : (writer.warn ?? writer.log);

  for (const line of lines) {
    write.call(writer, line);
  }
}

export function formatSmokeProductionReadiness(readiness) {
  const blockers = Array.isArray(readiness?.blockers)
    ? readiness.blockers
    : [];
  const nextActions = Array.isArray(readiness?.nextActions)
    ? readiness.nextActions
    : [];
  const warnings = Array.isArray(readiness?.warnings)
    ? readiness.warnings
    : [];

  if (readiness?.productionReady === true) {
    return formatReadyLines(warnings);
  }

  return formatBlockedLines(blockers, nextActions, warnings);
}

function formatReadyLines(warnings) {
  return [
    "\nProduction readiness: ready.",
    ...warnings.map((warning) => `  Warning: ${formatIssue(warning)}`),
  ];
}

function formatBlockedLines(blockers, nextActions, warnings) {
  return [
    "\nProduction readiness: blocked.",
    "Production smoke passed, but the report is not yet production-ready:",
    ...blockers.map((blocker) => `  - ${formatIssue(blocker)}`),
    ...formatNextActionLines(nextActions),
    ...warnings.map((warning) => `  Warning: ${formatIssue(warning)}`),
  ];
}

function formatNextActionLines(actions) {
  if (actions.length === 0) {
    return [];
  }

  return [
    "Next actions:",
    ...actions.map((action) => `  - ${formatAction(action)}`),
  ];
}

function formatIssue(issue) {
  const area = formatCliValue(issue?.area, "unknown", maxIssueAreaLength);
  const code = formatCliValue(issue?.issue, "unknown", maxIssueCodeLength);
  const message = formatCliValue(
    issue?.message,
    "No remediation message provided.",
    maxIssueMessageLength,
  );
  const context = formatIssueContext(issue);

  return formatCliValue(
    `[${area}/${code}] ${message}${context ? ` (${context})` : ""}`,
    "",
    maxIssueLineLength,
  );
}

function formatAction(action) {
  const area = formatCliValue(action?.area, "unknown", maxIssueAreaLength);
  const message = formatCliValue(
    action?.action,
    "Review the production readiness blocker.",
    maxActionLineLength,
  );

  return formatCliValue(`[${area}] ${message}`, "", maxActionLineLength);
}

function formatIssueContext(issue) {
  const fields = [
    formatField("host", issue?.host),
    formatField("path", issue?.path),
    formatField("variable", issue?.variable),
    formatListField("missing", issue?.missingRequired),
    formatIssueListField("issues", issue?.issues),
  ].filter(Boolean);

  return fields.join(", ");
}

function formatField(name, value) {
  const formatted = formatContextValue(value);

  return formatted ? `${name}: ${formatted}` : null;
}

function formatListField(name, value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const items = value.map((item) => formatContextValue(item)).filter(Boolean);

  return formatContextListField(name, items);
}

function formatIssueListField(name, value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const items = value
    .map((issue) => {
      const variable = formatContextValue(issue?.variable);
      const code = formatContextValue(issue?.issue);
      return variable && code ? `${variable} ${code}` : null;
    })
    .filter(Boolean);

  return formatContextListField(name, items);
}

function formatContextListField(name, items) {
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, maxContextItemCount);
  const hiddenCount = items.length - visibleItems.length;
  const suffix = hiddenCount > 0 ? `, ... (${hiddenCount} more)` : "";

  return `${name}: ${visibleItems.join(", ")}${suffix}`;
}

function formatContextValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return formatCliValue(String(value), "", maxContextValueLength);
}

function formatCliValue(value, fallback, maxLength) {
  const text = typeof value === "string" && value.length > 0 ? value : fallback;
  return formatSmokeText(text, { maxLength });
}
