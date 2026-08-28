import { readReleaseTraceabilityGroups } from "./smoke-release-evidence.mjs";
import { createSmokeReportSummary } from "./smoke-report-summary.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

const maxReleaseBlockerCount = 8;
const maxReleaseLineLength = 420;
const maxReleaseValueLength = 160;

const requiredConfigGates = [
  {
    action: "Run production smoke with SMOKE_REQUIRE_R2_UPLOAD=true.",
    key: "requireR2Upload",
    label: "R2 upload smoke required",
  },
  {
    action: "Run production smoke with SMOKE_REQUIRE_ADMIN_APP=true.",
    key: "requireAdminApp",
    label: "Admin static app smoke required",
  },
  {
    action: "Run production smoke with SMOKE_REQUIRE_REVALIDATION=true.",
    key: "requireRevalidation",
    label: "Storefront revalidation smoke required",
  },
];

export {
  readSmokeReleaseCheckArtifact,
  readSmokeReleaseCheckCliConfig,
} from "./smoke-release-check-config.mjs";

export function createSmokeReleaseCheck(artifact) {
  const report = artifact?.report ?? artifact;
  const summary = createSmokeReportSummary(report);
  const blockers = [];
  const groups = readReleaseTraceabilityGroups(report);

  addRequirement(blockers, isSmokeSummaryPassed(summary), {
    action: "Rerun production smoke until summary.status=passed and no checks fail.",
    label: "Smoke report not passed",
  });
  addRequirement(blockers, summary.productionReady === true, {
    action: "Resolve productionReadiness blockers before marking the release ready.",
    label: "Production readiness gates blocked",
  });
  addRequirement(blockers, isIsoTimestamp(report?.finishedAt), {
    action: "Use a completed smoke report artifact with a valid finishedAt timestamp.",
    label: "Smoke report not completed",
  });
  addRequirement(blockers, hasText(report?.storefrontUrl), {
    action: "Capture storefrontUrl in the smoke report before saving release evidence.",
    label: "Public storefront URL missing",
  });

  for (const gate of requiredConfigGates) {
    addRequirement(blockers, report?.config?.[gate.key] === true, gate);
  }

  for (const group of groups) {
    if (group.status !== "passed") {
      blockers.push({
        action: group.action,
        label: `${group.label} traceability ${group.status}`,
      });
    }
  }

  return {
    blockers,
    groups,
    path: readArtifactPath(artifact, report),
    releaseReady: blockers.length === 0,
    summary,
  };
}

export function formatSmokeReleaseCheck(artifact) {
  const check = createSmokeReleaseCheck(artifact);
  const config = (artifact?.report ?? artifact)?.config ?? {};
  const lines = [
    `Release evidence check: ${formatReleaseValue(check.path, "unknown")}`,
    `  Status: ${check.releaseReady ? "ready" : "blocked"}`,
    `  Smoke report: ${isSmokeSummaryPassed(check.summary) ? "passed" : "blocked"}`,
    `  Production gates: ${check.summary.productionReady === true ? "passed" : "blocked"}`,
    `  Required gates: R2 upload ${formatRequiredGate(config.requireR2Upload)}, Admin app ${formatRequiredGate(config.requireAdminApp)}, revalidation ${formatRequiredGate(config.requireRevalidation)}`,
    `  Traceability: ${check.groups
      .map((group) => `${group.label} ${group.status}`)
      .join(", ")}`,
  ];

  if (check.blockers.length > 0) {
    lines.push("  Blockers:");
    lines.push(...formatReleaseBlockers(check.blockers));
  } else {
    lines.push("  Evidence is ready for release notes.");
  }

  return lines.map(formatReleaseLine);
}

function addRequirement(blockers, passed, requirement) {
  if (!passed) {
    blockers.push({
      action: requirement.action,
      label: requirement.label,
    });
  }
}

function isSmokeSummaryPassed(summary) {
  return summary.status === "passed" && summary.failedCheckCount === 0;
}

function readArtifactPath(artifact, report) {
  return artifact?.path ?? report?.config?.reportPath ?? null;
}

function isIsoTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function hasText(value) {
  return typeof value === "string" && value.length > 0;
}

function formatRequiredGate(value) {
  return value === true ? "required" : "not required";
}

function formatReleaseBlockers(blockers) {
  const visible = blockers.slice(0, maxReleaseBlockerCount);
  const hidden = blockers.length - visible.length;
  const lines = visible.map(
    (blocker) => `    - ${blocker.label}: ${blocker.action}`,
  );

  if (hidden > 0) {
    lines.push(`    - ... and ${hidden} more release evidence blockers`);
  }

  return lines;
}

function formatReleaseValue(value, fallback) {
  return formatSmokeText(hasText(value) ? value : fallback, {
    maxLength: maxReleaseValueLength,
  });
}

function formatReleaseLine(line) {
  const prefix = line.match(/^ */u)?.[0] ?? "";
  const maxLength = Math.max(3, maxReleaseLineLength - prefix.length);

  return `${prefix}${formatSmokeText(line.slice(prefix.length), {
    maxLength,
  })}`;
}
