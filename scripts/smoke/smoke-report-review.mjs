import { formatSmokeReportSummary } from "./smoke-report-cli.mjs";
import { readFailureActions } from "./smoke-report-diagnostics.mjs";
import { createSmokeReportSummary } from "./smoke-report-summary.mjs";
import { formatSmokeText } from "./smoke-text.mjs";

const maxReviewLineLength = 420;
const maxReviewValueLength = 180;
const maxVisibleBlockerCount = 4;
const maxVisibleCheckCount = 6;

const focusGroups = [
  {
    blockerAreas: ["media.r2", "media.cdn", "media.external-hosts"],
    checks: ["media.upload-target"],
    label: "R2/CDN",
    notRequiredHint:
      "set SMOKE_REQUIRE_R2_UPLOAD=true to prove R2 upload and CDN delivery",
    required: (report) => report?.config?.requireR2Upload === true,
  },
  {
    blockerAreas: ["deployment.admin"],
    checks: ["admin.app"],
    label: "Admin static app",
    notRequiredHint:
      "set SMOKE_REQUIRE_ADMIN_APP=true to prove Admin static hosting",
    required: (report) => report?.config?.requireAdminApp === true,
  },
  {
    blockerAreas: [
      "deployment.api",
      "deployment.web",
      "revalidation",
      "revalidation.secret",
      "revalidation.url",
    ],
    checks: [
      "page.preview",
      "page.publish",
      "page.rollback",
      "audit.logs",
      "public-page.api",
      "public-page.fallback-api",
      "storefront.page",
      "seo.robots",
      "seo.sitemap",
      "seo.not-found",
    ],
    label: "Publish flow",
    required: () => true,
  },
];

export function formatSmokeReportReview(artifact) {
  const report = artifact?.report ?? artifact;
  const reportWithSummary = {
    ...report,
    summary: artifact?.summary ?? createSmokeReportSummary(report),
  };

  return [
    `Smoke report archive: ${formatReviewValue(artifact?.path, "unknown")}`,
    ...formatMetadataLines(report),
    ...formatSmokeReportSummary(reportWithSummary),
    "Traceability:",
    ...focusGroups.map((group) => formatFocusGroupLine(report, group)),
  ];
}

export function formatSmokeReportArchiveIndex(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return [
      "No smoke reports found under .tmp/, artifacts/, reports/, or tmp/.",
      "Run SMOKE_REPORT_PATH=reports/production/smoke-report.json pnpm smoke:publish first.",
    ];
  }

  return [
    "Smoke report archive:",
    ...artifacts.map((artifact, index) =>
      formatArchiveIndexLine(artifact, index),
    ),
  ];
}

function formatMetadataLines(report) {
  return [
    `  Started: ${formatReviewValue(report?.startedAt, "unknown")}`,
    `  Finished: ${formatReviewValue(report?.finishedAt, "not finished")}`,
    `  Slug: ${formatReviewValue(report?.slug, "unknown")}`,
    `  Storefront URL: ${formatReviewValue(report?.storefrontUrl, "unknown")}`,
    `  Storefront request URL: ${formatReviewValue(
      report?.storefrontRequestUrl,
      "unknown",
    )}`,
  ];
}

function formatArchiveIndexLine(artifact, index) {
  const summary =
    artifact?.summary ?? createSmokeReportSummary(artifact?.report);
  const gates = summary.productionReady === true ? "ready" : "blocked";
  const status = formatReviewValue(summary.status, "unknown", 80);
  const checks = `${readCount(summary.passedCheckCount)}/${readCount(
    summary.checkCount,
  )} checks`;
  const failed = `${readCount(summary.failedCheckCount)} failed`;
  const finishedAt = formatReviewValue(
    artifact?.finishedAt ?? artifact?.report?.finishedAt,
    "not finished",
    80,
  );

  return formatReviewLine(
    `  ${index + 1}. ${artifact.path} | ${status} | ${checks} | ${failed} | production ${gates} | ${finishedAt}`,
  );
}

function formatFocusGroupLine(report, group) {
  const checks = group.checks.map((name) => readCheckState(report, name));
  const blockers = readReadinessBlockers(report, group.blockerAreas);
  const required = group.required(report);
  const status = readFocusStatus(checks, blockers, required);
  const details = [
    formatCheckDetails(checks),
    formatBlockerDetails(blockers),
    !required && group.notRequiredHint ? group.notRequiredHint : null,
  ].filter(Boolean);

  return formatReviewLine(
    `  ${group.label}: ${status}${details.length > 0 ? ` (${details.join("; ")})` : ""}`,
  );
}

function readFocusStatus(checks, blockers, required) {
  if (checks.some((check) => check.status === "failed")) {
    return "failed";
  }

  if (!required) {
    return "not required";
  }

  if (blockers.length > 0) {
    return "blocked";
  }

  if (checks.length > 0 && checks.every((check) => check.status === "passed")) {
    return "passed";
  }

  if (checks.some((check) => check.status === "passed")) {
    return "partial";
  }

  return "not captured";
}

function readCheckState(report, name) {
  const check = Array.isArray(report?.checks)
    ? report.checks.find((item) => item?.name === name)
    : null;

  return {
    name,
    status:
      check?.status === "passed" || check?.status === "failed"
        ? check.status
        : "missing",
  };
}

function readReadinessBlockers(report, areas) {
  const blockers = Array.isArray(report?.productionReadiness?.blockers)
    ? report.productionReadiness.blockers
    : [];

  return blockers.filter(
    (blocker) =>
      typeof blocker?.area === "string" && areas.includes(blocker.area),
  );
}

function formatCheckDetails(checks) {
  if (checks.length === 0) {
    return null;
  }

  const visible = checks.slice(0, maxVisibleCheckCount);
  const hidden = checks.length - visible.length;
  const suffix = hidden > 0 ? `, ... (${hidden} more)` : "";

  return `checks: ${visible
    .map((check) => `${check.name} ${check.status}`)
    .join(", ")}${suffix}`;
}

function formatBlockerDetails(blockers) {
  if (blockers.length === 0) {
    return null;
  }

  const visible = blockers.slice(0, maxVisibleBlockerCount);
  const hidden = blockers.length - visible.length;
  const suffix = hidden > 0 ? `, ... (${hidden} more)` : "";

  return `blockers: ${visible
    .map((blocker) => `${blocker.area}/${blocker.issue ?? "unknown"}`)
    .join(", ")}${suffix}`;
}

export function formatSmokeReportFailureActions(report) {
  const summary = report?.summary ?? createSmokeReportSummary(report);
  const details = Array.isArray(summary.failedCheckDetails)
    ? summary.failedCheckDetails
    : [];

  return readFailureActions(details);
}

function readCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function formatReviewValue(value, fallback, maxLength = maxReviewValueLength) {
  return formatSmokeText(
    typeof value === "string" && value.length > 0 ? value : fallback,
    { maxLength },
  );
}

function formatReviewLine(line) {
  return formatSmokeText(line, { maxLength: maxReviewLineLength });
}
