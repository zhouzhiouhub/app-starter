const maxBlockerLines = 12;

export function formatReleaseNotesBlockers(blockers, { formatInline }) {
  if (!Array.isArray(blockers) || blockers.length === 0) {
    return ["- None"];
  }

  const visible = blockers
    .slice(0, maxBlockerLines)
    .map(
      (blocker) =>
        `- ${formatInline(blocker.area)}: ${formatInline(blocker.label)} - ${formatInline(
          blocker.action,
        )}`,
    );
  const hidden = blockers.length - visible.length;

  if (hidden > 0) {
    visible.push(`- ... and ${hidden} more blockers`);
  }

  return visible;
}
