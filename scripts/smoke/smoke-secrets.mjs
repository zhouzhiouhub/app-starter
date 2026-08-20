const secretKeyPattern =
  "accessToken|authorization|credential|password|previewToken|refreshToken|secret|signature|token|x-amz-credential|x-amz-security-token|x-amz-signature";
const sensitiveKeyNames = new Set([
  "accesstoken",
  "authorization",
  "credential",
  "password",
  "previewtoken",
  "refreshtoken",
  "secret",
  "signature",
  "token",
  "xamzcredential",
  "xamzsecuritytoken",
  "xamzsignature",
]);

export function redactSmokeSecrets(value) {
  return String(value)
    .replace(/(\/public\/preview\/)[^/?#\s)"']+/gi, "$1[redacted]")
    .replace(
      new RegExp(`([?&](?:${secretKeyPattern})=)[^&#\\s)"']+`, "gi"),
      "$1[redacted]",
    )
    .replace(
      new RegExp(
        `(["'](?:${secretKeyPattern})["']\\s*:\\s*["'])[^"']+(["'])`,
        "gi",
      ),
      "$1[redacted]$2",
    )
    .replace(
      new RegExp(
        `(\\b(?:${secretKeyPattern})\\b\\s*[=:]\\s*)[^&#\\s)"'<]+`,
        "gi",
      ),
      "$1[redacted]",
    )
    .replace(/(\bAuthorization\s+Bearer\s+)[a-zA-Z0-9._-]+/gi, "$1[redacted]")
    .replace(/(\bBearer\s+)[a-zA-Z0-9._-]+/gi, "$1[redacted]")
    .replace(
      /(\b(?:password|secret|token)\s+)((?:[a-zA-Z0-9_-]+\.)+[a-zA-Z0-9._-]+|[a-zA-Z0-9._-]{24,})/gi,
      "$1[redacted]",
    );
}

export function redactSmokeReportValue(value) {
  if (typeof value === "string") {
    return redactSmokeSecrets(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSmokeReportValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        isSensitiveSmokeKey(key) ? "[redacted]" : redactSmokeReportValue(child),
      ]),
    );
  }

  return value;
}

function isSensitiveSmokeKey(key) {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();

  return (
    sensitiveKeyNames.has(normalized) ||
    normalized.endsWith("credential") ||
    normalized.endsWith("password") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("signature") ||
    normalized.endsWith("token")
  );
}
