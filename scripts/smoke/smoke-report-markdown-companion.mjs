import { Buffer } from "node:buffer";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createSmokeReportSummary } from "./smoke-report-summary.mjs";
import {
  normalizeSmokeReportMarkdownPath,
  normalizeSmokeReportPath,
} from "./smoke-report-path-config.mjs";

const requiredReviewSections = [
  "## Metadata",
  "## Checks",
  "## Production Readiness",
  "## Traceability",
  "## Failure Details",
  "## Suggested Fixes",
];

export async function readSmokeReportMarkdownCompanion(
  reportPath,
  report,
  options = {},
) {
  const normalizedReportPath = normalizeSmokeReportPath(reportPath);
  const markdownPath =
    readSmokeReportMarkdownCompanionPath(normalizedReportPath);
  const absolutePath = join(options.baseDir ?? process.cwd(), markdownPath);

  try {
    const [content, stats] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath),
    ]);

    return createSmokeReportMarkdownCompanionCheck({
      content,
      mtimeMs: stats.mtimeMs,
      path: markdownPath,
      report,
      reportPath: normalizedReportPath,
      size: stats.size,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return createMissingSmokeReportMarkdownCompanion(normalizedReportPath);
    }

    throw error;
  }
}

export function createSmokeReportMarkdownCompanionCheck(input) {
  const content = typeof input.content === "string" ? input.content : "";
  const path = normalizeSmokeReportMarkdownPath(input.path);
  const reportPath = normalizeSmokeReportPath(input.reportPath);
  const issues = readSmokeReportMarkdownIssues({
    content,
    path,
    report: input.report,
    reportPath,
  });

  return {
    issueCount: issues.length,
    issues,
    mtimeMs: Number.isFinite(input.mtimeMs) ? input.mtimeMs : null,
    path,
    size: Number.isFinite(input.size)
      ? input.size
      : Buffer.byteLength(content, "utf8"),
    status: issues.length === 0 ? "complete" : "invalid",
  };
}

export function createMissingSmokeReportMarkdownCompanion(reportPath) {
  const normalizedReportPath = normalizeSmokeReportPath(reportPath);
  const path = readSmokeReportMarkdownCompanionPath(normalizedReportPath);

  return {
    issueCount: 1,
    issues: [
      {
        code: "smoke_report_markdown_missing",
        message: [
          `Expected smoke report Markdown companion at ${path}.`,
          "Run",
          `pnpm smoke:report -- --markdown-output ${path} ${normalizedReportPath}`,
          "before marking release evidence ready.",
        ].join(" "),
        severity: "error",
      },
    ],
    mtimeMs: null,
    path,
    size: 0,
    status: "missing",
  };
}

export function readSmokeReportMarkdownCompanionPath(reportPath) {
  const normalizedReportPath = normalizeSmokeReportPath(reportPath);

  return normalizeSmokeReportMarkdownPath(
    normalizedReportPath.replace(/\.json$/iu, ".md"),
  );
}

function readSmokeReportMarkdownIssues(input) {
  const issues = [];
  const summary = createSmokeReportSummary(input.report);

  addRequiredContent(issues, input.content.trim().length > 0, {
    code: "smoke_report_markdown_empty",
    message: `Smoke report Markdown companion at ${input.path} is empty.`,
  });
  addRequiredContent(
    issues,
    /^# Production Smoke Report$/mu.test(input.content),
    {
      code: "smoke_report_markdown_heading_missing",
      message: `${input.path} must include the Production Smoke Report heading.`,
    },
  );
  addRequiredLine(issues, input, `Archive: \`${input.reportPath}\``, {
    code: "smoke_report_markdown_archive_mismatch",
    message: `${input.path} must reference Archive: \`${input.reportPath}\`.`,
  });
  addRequiredLine(issues, input, `Schema: \`${input.report?.schemaVersion}\``, {
    code: "smoke_report_markdown_schema_mismatch",
    message: `${input.path} must reference the JSON smoke report schema.`,
  });
  addRequiredLine(issues, input, `Status: \`${summary.status}\``, {
    code: "smoke_report_markdown_status_mismatch",
    message: `${input.path} must match the JSON smoke report status.`,
  });

  for (const section of requiredReviewSections) {
    addRequiredContent(issues, input.content.includes(section), {
      code: "smoke_report_markdown_section_missing",
      message: `${input.path} must include ${section}.`,
    });
  }

  return issues;
}

function addRequiredLine(issues, input, line, issue) {
  addRequiredContent(issues, input.content.includes(line), issue);
}

function addRequiredContent(issues, passed, issue) {
  if (passed) {
    return;
  }

  issues.push({
    code: issue.code,
    message: issue.message,
    severity: "error",
  });
}
