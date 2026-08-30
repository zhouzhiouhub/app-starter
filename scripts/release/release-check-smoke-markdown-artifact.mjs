import { formatSmokeText } from "../smoke/smoke-text.mjs";

const maxArtifactTextLength = 420;
const maxSmokeMarkdownIssueCount = 20;

export function createSmokeMarkdownArtifact(markdown) {
  if (!markdown) {
    return null;
  }

  const issues = Array.isArray(markdown.issues) ? markdown.issues : [];

  return {
    issueCount: markdown.issueCount ?? issues.length,
    issues: issues
      .slice(0, maxSmokeMarkdownIssueCount)
      .map(createSmokeMarkdownIssueArtifact),
    path: readTextOrNull(markdown.path),
    status: readTextOrNull(markdown.status) ?? "unknown",
  };
}

function createSmokeMarkdownIssueArtifact(issue) {
  return {
    code: readTextOrNull(issue?.code) ?? "unknown",
    message: readTextOrNull(issue?.message) ?? "unknown",
    severity: readTextOrNull(issue?.severity) ?? "unknown",
  };
}

function readTextOrNull(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxArtifactTextLength });
}
