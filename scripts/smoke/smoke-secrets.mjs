const secretKeyPattern = [
  "access[-_]?token",
  "api[-_]?key",
  "auth[-_]?code",
  "authorization[-_]?code",
  "client[-_]?secret",
  "code[-_]?verifier",
  "connection[-_]?string",
  "cookie",
  "credential",
  "database[-_]?url",
  "dsn",
  "[a-z0-9]+[-_]?dsn",
  "id[-_]?token",
  "jwt",
  "oauth[-_]?code",
  "oauth[-_]?verifier",
  "password",
  "passphrase",
  "pem",
  "preview[-_]?token",
  "private[-_]?key(?:[-_]?pem)?",
  "refresh[-_]?token",
  "secret",
  "sig",
  "session[-_]?id",
  "session",
  "set[-_]?cookie",
  "signature",
  "token",
  "x-amz-[a-z0-9-]+",
].join("|");
const pemBlockPattern =
  /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;
const sensitiveKeyNames = new Set([
  "accesstoken",
  "apikey",
  "authcode",
  "authorization",
  "authorizationcode",
  "clientsecret",
  "codeverifier",
  "connectionstring",
  "cookie",
  "credential",
  "databaseurl",
  "dsn",
  "idtoken",
  "jwt",
  "oauthcode",
  "oauthverifier",
  "password",
  "passphrase",
  "pem",
  "previewtoken",
  "privatekey",
  "privatekeypem",
  "refreshtoken",
  "secret",
  "sig",
  "session",
  "sessionid",
  "setcookie",
  "signature",
  "token",
  "xamzalgorithm",
  "xamzcredential",
  "xamzdate",
  "xamzexpires",
  "xamzsecuritytoken",
  "xamzsignature",
  "xamzsignedheaders",
]);

export function redactSmokeSecrets(value) {
  return String(value)
    .replace(pemBlockPattern, "[redacted-pem]")
    .replace(
      /\b([a-z][a-z0-9+.-]*:\/\/)([^/?#\s)"'<@]+)(?::([^/?#\s)"'<@]*))?@/gi,
      "$1[redacted]@",
    )
    .replace(/(\/public\/preview\/)[^/?#\s)"']+/gi, "$1[redacted]")
    .replace(
      /(\bAuthorization\s*[:=]?\s*Bearer\s+)[a-zA-Z0-9._-]+/gi,
      "$1[redacted]",
    )
    .replace(
      /(\bAuthorization\s*[:=]?\s*(?:AWS4-HMAC-SHA256|Api-?Key|Basic|Digest|Negotiate|NTLM|OAuth|Token)\s+)[^&#\s)"'<;,]+/gi,
      "$1[redacted]",
    )
    .replace(
      /(\bAuthorization\s*[=:]\s*)(?![a-z][a-z0-9+.-]*\s+\[redacted\])[^&#\s)"'<]+/gi,
      "$1[redacted]",
    )
    .replace(/(\bBearer\s+)[a-zA-Z0-9._-]+/gi, "$1[redacted]")
    .replace(
      new RegExp(`([?&#](?:${secretKeyPattern})=)[^&#\\s)"']+`, "gi"),
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
    normalized.endsWith("authcode") ||
    normalized.endsWith("authorizationcode") ||
    normalized.endsWith("clientsecret") ||
    normalized.endsWith("codeverifier") ||
    normalized.endsWith("connectionstring") ||
    normalized.endsWith("credential") ||
    normalized.endsWith("databaseurl") ||
    normalized.endsWith("dsn") ||
    normalized.endsWith("jwt") ||
    normalized.endsWith("oauthcode") ||
    normalized.endsWith("oauthverifier") ||
    normalized.endsWith("password") ||
    normalized.endsWith("passphrase") ||
    normalized.endsWith("pem") ||
    normalized.endsWith("privatekey") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("sig") ||
    normalized.endsWith("signature") ||
    normalized.endsWith("token")
  );
}
