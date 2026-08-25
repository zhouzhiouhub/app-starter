export function readR2Action(blocker) {
  if (blocker.issue === "r2-upload-smoke-not-required") {
    return "Set SMOKE_REQUIRE_R2_UPLOAD=true after configuring R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_REGION, and production MEDIA_CDN_BASE_URL so smoke proves presigned URL creation, actual PUT upload, and CDN delivery.";
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

  if (blocker.issue === "control-character") {
    return "Remove control characters from MEDIA_CDN_BASE_URL, including percent-encoded controls in the path.";
  }

  if (blocker.issue === "file-path") {
    return "Replace file-like MEDIA_CDN_BASE_URL paths with the CDN origin or a directory prefix such as /media.";
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

export function readExternalHostsAction(blocker) {
  const details = Array.isArray(blocker.issues)
    ? blocker.issues.map((issue) => readExternalHostIssueAction(issue))
    : [];
  const filtered = details.filter(Boolean);

  if (filtered.length === 0) {
    return "Set MEDIA_EXTERNAL_URL_HOSTS to comma-separated production hostnames or HTTPS origins without paths, query strings, credentials, local hosts, or placeholder hosts.";
  }

  return `Fix MEDIA_EXTERNAL_URL_HOSTS: ${filtered.join("; ")}.`;
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

function readExternalHostIssueAction(issue) {
  if (!issue || typeof issue !== "object") {
    return null;
  }

  const host = issue.host ?? "one entry";

  if (issue.issue === "unsupported-protocol") {
    return `${host} must use https:// or be listed as a bare hostname`;
  }

  if (issue.issue === "embedded-credentials") {
    return `remove usernames and passwords from ${host}`;
  }

  if (issue.issue === "unsupported-url-parts") {
    return `remove paths, query strings, and fragments from ${host}`;
  }

  if (issue.issue === "invalid-url") {
    return "replace one URL entry with a valid HTTPS origin";
  }

  if (issue.issue === "invalid-host") {
    return "replace one hostname entry with a valid production hostname";
  }

  if (issue.issue === "local-host") {
    return `replace ${host} with a public production media host`;
  }

  if (issue.issue === "placeholder-host") {
    return `replace placeholder host ${host} with the real production media host`;
  }

  return issue.host ? `${issue.host} has an unsupported value` : null;
}

function readR2IssueAction(issue) {
  if (!issue || typeof issue !== "object") {
    return null;
  }

  if (issue.issue === "invalid-account-id") {
    return "R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters";
  }

  if (issue.issue === "invalid-bucket") {
    return "R2_BUCKET must be 3-63 characters using lowercase letters, numbers, dots, or hyphens, without adjacent dot/hyphen pairs or IP address format";
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
