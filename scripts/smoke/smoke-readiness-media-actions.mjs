export function readR2Action(blocker) {
  if (blocker.issue === "r2-upload-smoke-not-required") {
    return "Configure R2 credentials and set SMOKE_REQUIRE_R2_UPLOAD=true.";
  }

  if (blocker.issue === "invalid-config") {
    return readInvalidR2Action(blocker.issues);
  }

  return `Set missing R2 variables${formatMissingList(blocker.missingRequired)}.`;
}

export function readCdnAction(blocker) {
  if (blocker.issue === "cdn-not-configured") {
    return "Set MEDIA_CDN_BASE_URL to the production HTTPS CDN URL used for published media.";
  }

  if (blocker.issue === "unsupported-protocol") {
    return "Use an https:// MEDIA_CDN_BASE_URL; production media CDN URLs cannot use http://.";
  }

  if (blocker.issue === "embedded-credentials") {
    return "Remove usernames, passwords, and credentials from MEDIA_CDN_BASE_URL.";
  }

  if (blocker.issue === "unsupported-url-parts") {
    return "Remove query strings and fragments from MEDIA_CDN_BASE_URL; keep only the HTTPS CDN origin or path prefix.";
  }

  if (blocker.issue === "local-host") {
    return "Replace local or private MEDIA_CDN_BASE_URL hosts with a public production HTTPS CDN host.";
  }

  if (blocker.issue === "placeholder-host") {
    return "Replace placeholder MEDIA_CDN_BASE_URL hosts with the real production HTTPS CDN host.";
  }

  if (blocker.issue === "invalid-url") {
    return "Set MEDIA_CDN_BASE_URL to a valid production HTTPS CDN URL.";
  }

  return "Set MEDIA_CDN_BASE_URL to a production HTTPS CDN URL.";
}

function readInvalidR2Action(issues) {
  const details = Array.isArray(issues)
    ? issues.map((issue) => readR2IssueAction(issue)).filter(Boolean)
    : [];

  if (details.length === 0) {
    return "Replace invalid R2 variables with production-safe account, bucket, credential, and region values.";
  }

  return `Fix invalid R2 variables: ${details.join("; ")}.`;
}

function readR2IssueAction(issue) {
  if (!issue || typeof issue !== "object") {
    return null;
  }

  if (issue.issue === "invalid-account-id") {
    return "R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters";
  }

  if (issue.issue === "invalid-bucket") {
    return "R2_BUCKET must be 3-63 characters using letters, numbers, dots, or hyphens";
  }

  if (issue.issue === "invalid-region") {
    return "R2_REGION must be a DNS-safe region label such as auto";
  }

  if (issue.issue === "invalid-credential") {
    return `${issue.variable ?? "R2 credentials"} must not contain whitespace or control characters`;
  }

  return issue.variable ? `${issue.variable} has an invalid value` : null;
}

function formatMissingList(values) {
  return Array.isArray(values) && values.length > 0
    ? `: ${values.join(", ")}`
    : "";
}
