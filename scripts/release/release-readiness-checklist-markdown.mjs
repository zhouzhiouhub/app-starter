import { formatSmokeText } from "../smoke/smoke-text.mjs";

const defaultMaxTextLength = 180;
const defaultMaxActionLength = 1200;

export function formatReadinessChecklistMarkdown(checklist, options = {}) {
  const items = Array.isArray(checklist?.items) ? checklist.items : [];

  if (items.length === 0) {
    return ["- Not recorded"];
  }

  return items.flatMap((item) => formatReadinessChecklistItem(item, options));
}

function formatReadinessChecklistItem(item, options) {
  return [
    `- ${formatText(item.label, options)}: ${formatText(item.status, options)}`,
    ...formatChecklistField("Detail", item.detail, options),
    ...formatChecklistField("Action", item.action, {
      ...options,
      maxTextLength: options.maxActionLength ?? defaultMaxActionLength,
    }),
    ...formatChecklistCommand("Bundle", item.bundleCommand, options),
    ...formatChecklistSteps(item.steps, options),
  ];
}

function formatChecklistSteps(steps, options) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return [];
  }

  const stepValueOptions = {
    ...options,
    maxTextLength: options.maxStepTextLength ?? options.maxTextLength,
  };

  return [
    "  - Steps:",
    ...steps.map(
      (step) =>
        `    - ${formatText(step.label, options)}: ${formatCode(
          step.value,
          stepValueOptions,
        )}`,
    ),
  ];
}

function formatChecklistField(label, value, options) {
  return hasText(value) ? [`  - ${label}: ${formatText(value, options)}`] : [];
}

function formatChecklistCommand(label, value, options) {
  return hasText(value)
    ? [`  - ${label}: ${formatCode(value, options)}`]
    : [];
}

function formatCode(value, options) {
  return `\`${formatText(value, options).replaceAll("`", "'")}\``;
}

function formatText(value, options = {}) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: options.maxTextLength ?? defaultMaxTextLength,
  });
}

function hasText(value) {
  return typeof value === "string" && value.length > 0;
}
