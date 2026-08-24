import { redactSmokeSecrets } from "./smoke-secrets.mjs";

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
  const area = issue?.area ?? "unknown";
  const code = issue?.issue ?? "unknown";
  const message = issue?.message ?? "No remediation message provided.";
  const context = formatIssueContext(issue);

  return redactSmokeSecrets(
    `[${area}/${code}] ${message}${context ? ` (${context})` : ""}`,
  );
}

function formatAction(action) {
  const area = action?.area ?? "unknown";
  const message = action?.action ?? "Review the production readiness blocker.";

  return redactSmokeSecrets(`[${area}] ${message}`);
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
  return value === null || value === undefined || value === ""
    ? null
    : `${name}: ${String(value)}`;
}

function formatListField(name, value) {
  return Array.isArray(value) && value.length > 0
    ? `${name}: ${value.join(", ")}`
    : null;
}

function formatIssueListField(name, value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const items = value
    .map((issue) => {
      const variable = issue?.variable;
      const code = issue?.issue;
      return variable && code ? `${variable} ${code}` : null;
    })
    .filter(Boolean);

  return items.length > 0 ? `${name}: ${items.join(", ")}` : null;
}
