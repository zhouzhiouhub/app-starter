import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxProjectNextActionLines = 3;
const maxTextLength = 180;

export function formatProjectNextActions(projectStatus, artifact) {
  if (!projectStatus || artifact.releaseReady === true) {
    return [""];
  }

  const actions = Array.isArray(projectStatus.nextActions)
    ? projectStatus.nextActions
    : [];

  if (actions.length === 0) {
    return [""];
  }

  const visible = actions
    .slice(0, maxProjectNextActionLines)
    .flatMap(formatProjectNextAction);
  const hidden = readHiddenActionCount(projectStatus, actions);

  if (hidden > 0) {
    visible.push(`- ... and ${hidden} more project next actions`);
  }

  return ["", "## Project Next Actions", "", ...visible, ""];
}

function readHiddenActionCount(projectStatus, actions) {
  const total =
    Number.isInteger(projectStatus.nextActionCount) &&
    projectStatus.nextActionCount >= actions.length
      ? projectStatus.nextActionCount
      : actions.length;

  return total - Math.min(actions.length, maxProjectNextActionLines);
}

function formatProjectNextAction(action) {
  const steps = formatProjectNextActionSteps(action.steps);
  const detail = steps.length > 0 ? steps : formatProjectNextActionDetail(action);

  return [
    `- ${formatInline(action.area)}: ${formatInline(action.label)}`,
    ...detail,
  ];
}

function formatProjectNextActionSteps(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .filter((step) => hasText(step?.label) && hasText(step?.value))
    .map(
      (step) =>
        `  - ${formatInline(step.label)}: \`${formatInline(step.value)}\``,
    );
}

function formatProjectNextActionDetail(action) {
  return hasText(action.action)
    ? [`  - Action: ${formatInline(action.action)}`]
    : [];
}

function formatInline(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxTextLength,
  });
}

function hasText(value) {
  return typeof value === "string" && value.length > 0;
}
