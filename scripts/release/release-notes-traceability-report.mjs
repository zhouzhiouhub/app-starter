export function formatReleaseNotesTraceability(groups, { formatInline }) {
  if (!Array.isArray(groups) || groups.length === 0) {
    return ["- No production smoke traceability was recorded."];
  }

  return groups.map(
    (group) =>
      `- ${formatInline(group.label)}: ${formatInline(group.status)} (${formatInline(
        group.action ?? "no action",
      )})`,
  );
}
