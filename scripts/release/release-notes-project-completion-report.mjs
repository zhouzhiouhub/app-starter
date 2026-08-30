import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxProjectCompletionActionLength = 420;
const maxProjectCompletionTextLength = 180;

export function formatProjectCompletionChecklist(projectStatus) {
  const checklist = projectStatus?.completionChecklist;

  if (!checklist || !Array.isArray(checklist.items)) {
    return [];
  }

  return [
    "## Project Completion Checklist",
    "",
    `- Complete: ${formatCount(checklist.completeCount)}/${formatCount(
      checklist.itemCount,
    )}`,
    `- Needs evidence: ${formatCount(
      checklist.needsEvidenceCount,
    )}/${formatCount(checklist.itemCount)}`,
    ...checklist.items.flatMap(formatProjectCompletionItem),
  ];
}

function formatProjectCompletionItem(item) {
  const lines = [
    `- ${formatInline(item.label)}: ${formatInline(item.status)}`,
    `  - Evidence: ${formatInline(item.evidence)}`,
  ];

  if (hasText(item.nextAction)) {
    lines.push(
      `  - Next: ${formatInline(item.nextAction, {
        maxLength: maxProjectCompletionActionLength,
      })}`,
    );
  }

  if (Array.isArray(item.nextSteps) && item.nextSteps.length > 0) {
    lines.push("  - Next steps:");
    lines.push(
      ...item.nextSteps
        .filter((step) => hasText(step?.label) && hasText(step?.value))
        .map(
          (step) =>
            `    - ${formatInline(step.label)}: \`${formatInline(step.value, {
              maxLength: maxProjectCompletionActionLength,
            })}\``,
        ),
    );
  }

  return lines;
}

function formatCount(value) {
  return Number.isFinite(value) ? value : "unknown";
}

function formatInline(value, options = {}) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: options.maxLength ?? maxProjectCompletionTextLength,
  });
}

function hasText(value) {
  return typeof value === "string" && value.length > 0;
}
