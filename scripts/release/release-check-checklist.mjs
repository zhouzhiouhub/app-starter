import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxChecklistLineLength = 420;

export function createReleaseEvidenceReadinessChecklist(check) {
  return {
    items: [
      createSmokeChecklistItem(check),
      createVisualChecklistItem(check),
      createReleaseNotesChecklistItem(check),
    ],
    releaseReady: check.releaseReady,
  };
}

export function formatReleaseEvidenceReadinessChecklist(checklist) {
  const lines = ["Release readiness checklist:"];

  for (const item of checklist.items) {
    lines.push(`  - ${item.label}: ${item.status}`);

    if (item.detail) {
      lines.push(`    Detail: ${item.detail}`);
    }

    if (item.action) {
      lines.push(`    Action: ${item.action}`);
    }
  }

  return lines.map(formatChecklistLine);
}

function createSmokeChecklistItem(check) {
  if (check.smoke.releaseReady) {
    return {
      detail: `Report path: ${check.smoke.path ?? "latest archive"}`,
      label: "Production Smoke report",
      status: "ready",
    };
  }

  return {
    action: readFirstBlockerAction(check, "Production Smoke"),
    detail: `Report path: ${check.smoke.path ?? "latest archive"}`,
    label: "Production Smoke report",
    status: "blocked",
  };
}

function createVisualChecklistItem(check) {
  const detail = [
    `${check.visual.acceptedComponentCount}/${check.visual.componentCount} components`,
    `${check.visual.acceptedViewportCount}/${check.visual.viewportCount} viewports`,
  ].join(", ");

  if (check.visual.status === "accepted") {
    return {
      detail,
      label: "Page Builder Visual evidence",
      status: "ready",
    };
  }

  return {
    action: readFirstBlockerAction(check, "Page Builder Visual"),
    detail,
    label: "Page Builder Visual evidence",
    status: check.visual.status,
  };
}

function createReleaseNotesChecklistItem(check) {
  if (check.releaseReady) {
    return {
      action:
        "Run pnpm release:notes with release tag, workflow run URL, artifact names, storefront URL, and rollback target.",
      label: "Release notes record",
      status: "ready to generate",
    };
  }

  return {
    action:
      "Wait until Production Smoke and Page Builder Visual evidence are ready, then run pnpm release:notes.",
    label: "Release notes record",
    status: "waiting for evidence",
  };
}

function readFirstBlockerAction(check, area) {
  return (
    check.blockers.find((blocker) => blocker.area === area)?.action ??
    "Review the release evidence blockers above."
  );
}

function formatChecklistLine(line) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength = Math.max(3, maxChecklistLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
