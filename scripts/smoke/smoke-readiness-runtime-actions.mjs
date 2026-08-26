const reportPathRoots = "tmp/, reports/, artifacts/, or .tmp/";

export function readJwtAction(blocker) {
  if (blocker.area === "identity.jwt.pair") {
    return readJwtPairAction(blocker.issue);
  }

  const variable = blocker.variable ?? "JWT_PRIVATE_KEY/JWT_PUBLIC_KEY";
  const label = readJwtPemLabel(variable);

  if (blocker.issue === "invalid-pem") {
    return `Fix ${variable} PEM formatting, including BEGIN/END ${label} lines and escaped \\n line breaks in env storage.`;
  }

  if (
    blocker.issue === "missing-key" ||
    blocker.issue === "missing-diagnostics"
  ) {
    return `Set ${variable} to a production RS256 ${label} PEM in the API runtime.`;
  }

  return `Set ${variable} to a valid production RS256 ${label} PEM in the API runtime.`;
}

export function readPreviewSecretAction(blocker) {
  const variable = blocker.variable ?? readPreviewSecretVariable(blocker.area);

  if (variable === "PREVIEW_TOKEN_PREVIOUS_SECRET") {
    return readPreviousPreviewSecretAction(blocker.issue);
  }

  if (blocker.issue === "short-secret") {
    return "Set PREVIEW_TOKEN_SECRET to a 32-1024 character production signing secret; current value is too short.";
  }

  if (blocker.issue === "oversized-secret") {
    return "Shorten PREVIEW_TOKEN_SECRET to 1024 characters or fewer.";
  }

  if (blocker.issue === "control-character") {
    return "Remove control characters from PREVIEW_TOKEN_SECRET; keep it 32-1024 characters.";
  }

  return "Set PREVIEW_TOKEN_SECRET to a 32-1024 character production signing secret in the API runtime.";
}

export function readRevalidationSecretAction(blocker) {
  if (blocker.issue === "oversized-secret") {
    return "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes; keep it at 1024 characters or fewer.";
  }

  if (blocker.issue === "control-character") {
    return "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes without control characters.";
  }

  if (blocker.issue === "surrounding-whitespace") {
    return "Remove leading and trailing whitespace from STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.";
  }

  return "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.";
}

export function readRevalidationGateAction() {
  return "Set SMOKE_REQUIRE_REVALIDATION=true, configure STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes, and set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint.";
}

export function readReportPathAction(blocker) {
  if (blocker.issue === "report-path-not-configured") {
    return `Set SMOKE_REPORT_PATH to archive a JSON report under ${reportPathRoots}.`;
  }

  if (blocker.issue === "empty-path") {
    return `Set SMOKE_REPORT_PATH to a non-empty relative JSON path under ${reportPathRoots}.`;
  }

  if (
    blocker.issue === "absolute-or-null-path" ||
    blocker.issue === "invalid-path"
  ) {
    return `Use a relative SMOKE_REPORT_PATH under ${reportPathRoots}; do not use absolute paths or null bytes.`;
  }

  if (blocker.issue === "unsafe-root") {
    return `Move SMOKE_REPORT_PATH under ${reportPathRoots}.`;
  }

  if (blocker.issue === "unsafe-segments") {
    return "Use only safe SMOKE_REPORT_PATH segments without empty parts, traversal, reserved names, trailing dots, special characters, or .json directories.";
  }

  if (blocker.issue === "non-json-extension") {
    return "Change SMOKE_REPORT_PATH to end with .json.";
  }

  return `Set SMOKE_REPORT_PATH to a relative JSON path under ${reportPathRoots}.`;
}

function readJwtPairAction(issue) {
  if (issue === "mismatched-key-pair") {
    return "Regenerate JWT_PUBLIC_KEY from JWT_PRIVATE_KEY or replace both with one matching RS256 PEM key pair.";
  }

  if (issue === "invalid-key-pair") {
    return "Replace JWT_PRIVATE_KEY and JWT_PUBLIC_KEY with a valid RS256 PEM key pair that can sign and verify RS256 tokens.";
  }

  return "Replace JWT_PRIVATE_KEY and JWT_PUBLIC_KEY with a matching RS256 PEM key pair in the API runtime.";
}

function readJwtPemLabel(variable) {
  return variable === "JWT_PUBLIC_KEY" ? "PUBLIC KEY" : "PRIVATE KEY";
}

function readPreviewSecretVariable(area) {
  return area === "preview.previous-secret"
    ? "PREVIEW_TOKEN_PREVIOUS_SECRET"
    : "PREVIEW_TOKEN_SECRET";
}

function readPreviousPreviewSecretAction(issue) {
  if (issue === "short-secret") {
    return "Remove PREVIEW_TOKEN_PREVIOUS_SECRET unless rotating preview secrets; if rotating, set it to 32-1024 characters.";
  }

  if (issue === "oversized-secret") {
    return "Remove PREVIEW_TOKEN_PREVIOUS_SECRET unless rotating preview secrets; if rotating, shorten it to 1024 characters or fewer.";
  }

  if (issue === "control-character") {
    return "Remove PREVIEW_TOKEN_PREVIOUS_SECRET unless rotating preview secrets; if rotating, remove control characters and keep it 32-1024 characters.";
  }

  return "Remove PREVIEW_TOKEN_PREVIOUS_SECRET or set it to the previous 32-1024 character production-safe signing secret.";
}
