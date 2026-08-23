const logSecretKeyPattern = [
  "access[-_]?token",
  "api[-_]?key",
  "client[-_]?secret",
  "connection[-_]?string",
  "cookie",
  "credential",
  "database[-_]?url",
  "dsn",
  "[a-z0-9]+[-_]?dsn",
  "id[-_]?token",
  "jwt",
  "password",
  "passphrase",
  "pem",
  "preview[-_]?token",
  "private[-_]?key(?:[-_]?pem)?",
  "refresh[-_]?token",
  "secret",
  "session[-_]?id",
  "session",
  "set[-_]?cookie",
  "signature",
  "token",
  "x-amz-[a-z0-9-]+",
].join("|");

const sensitiveLogKeySuffixes = [
  "accesskeyid",
  "accesstoken",
  "apikey",
  "clientsecret",
  "connectionstring",
  "credential",
  "cookie",
  "databaseurl",
  "dsn",
  "idtoken",
  "jwt",
  "password",
  "passphrase",
  "pem",
  "previewtoken",
  "privatekey",
  "privatekeypem",
  "refreshtoken",
  "secret",
  "secretaccesskey",
  "session",
  "sessionid",
  "signature",
  "token",
];

const sensitiveLogKeys = new Set([
  "authorization",
  "setcookie",
  "xamzalgorithm",
  "xamzcredential",
  "xamzdate",
  "xamzexpires",
  "xamzsecuritytoken",
  "xamzsignature",
  "xamzsignedheaders",
  ...sensitiveLogKeySuffixes,
]);

const redactedValue = "[redacted]";

export function redactLogSecrets(value: unknown): string {
  return String(value)
    .replace(
      /\b([a-z][a-z0-9+.-]*:\/\/)([^/?#\s)"'<@]+)(?::([^/?#\s)"'<@]*))?@/gi,
      "$1[redacted]@",
    )
    .replace(
      /(\bAuthorization\s*[:=]?\s*Bearer\s+)[a-zA-Z0-9._-]+/gi,
      "$1[redacted]",
    )
    .replace(
      /(\bAuthorization\s*[=:]\s*)(?!Bearer\s+\[redacted\])[^&#\s)"'<;,]+/gi,
      "$1[redacted]",
    )
    .replace(/(\bBearer\s+)[a-zA-Z0-9._-]+/gi, "$1[redacted]")
    .replace(
      new RegExp(`([?&#](?:${logSecretKeyPattern})=)[^&#\\s)"']+`, "gi"),
      "$1[redacted]",
    )
    .replace(
      new RegExp(
        `(["'](?:${logSecretKeyPattern})["']\\s*:\\s*["'])[^"']+(["'])`,
        "gi",
      ),
      "$1[redacted]$2",
    )
    .replace(
      /(["']authorization["']\s*:\s*["'])[^"']+(["'])/gi,
      "$1[redacted]$2",
    )
    .replace(
      new RegExp(
        `(\\b(?:${logSecretKeyPattern})\\b\\s*[=:]\\s*)[^&#\\s)"'<;,]+`,
        "gi",
      ),
      `$1${redactedValue}`,
    );
}

export function redactStructuredSecrets(value: unknown): unknown {
  if (typeof value === "string") {
    return redactLogSecrets(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactStructuredSecrets(item));
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitiveLogKey(key) ? redactedValue : redactStructuredSecrets(item),
    ]),
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSensitiveLogKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return (
    sensitiveLogKeys.has(normalized) ||
    sensitiveLogKeySuffixes.some((suffix) => normalized.endsWith(suffix))
  );
}
