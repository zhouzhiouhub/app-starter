const apiSecretKeyPattern = [
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
  "session[-_]?id",
  "session",
  "set[-_]?cookie",
  "signature",
  "token",
  "x-amz-[a-z0-9-]+",
].join("|");
const pemBlockPattern =
  /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;
const redactedPemValue = "[redacted-pem]";

export function redactApiMessageSecrets(value: string): string {
  return value
    .replace(pemBlockPattern, redactedPemValue)
    .replace(
      /(\/api\/v1\/public\/preview\/)[a-zA-Z0-9._-]+/g,
      "$1[redacted]",
    )
    .replace(
      /\b([a-z][a-z0-9+.-]*:\/\/)([^/?#\s)"'<@]+)(?::([^/?#\s)"'<@]*))?@/gi,
      "$1[redacted]@",
    )
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
      new RegExp(`([?&#](?:${apiSecretKeyPattern})=)[^&#\\s)"']+`, "gi"),
      "$1[redacted]",
    )
    .replace(
      new RegExp(
        `(["'](?:${apiSecretKeyPattern})["']\\s*:\\s*["'])[^"']+(["'])`,
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
        `(\\b(?:${apiSecretKeyPattern})\\b\\s*[=:]\\s*)[^&#\\s)"'<;,]+`,
        "gi",
      ),
      "$1[redacted]",
    );
}
