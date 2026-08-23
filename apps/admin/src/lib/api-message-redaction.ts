const apiSecretKeyPattern = [
  "access[-_]?token",
  "api[-_]?key",
  "client[-_]?secret",
  "cookie",
  "id[-_]?token",
  "jwt",
  "password",
  "preview[-_]?token",
  "refresh[-_]?token",
  "secret",
  "signature",
  "token",
  "x-amz-[a-z0-9-]+",
].join("|");

export function redactApiMessageSecrets(value: string): string {
  return value
    .replace(
      /\b([a-z][a-z0-9+.-]*:\/\/)([^/?#\s)"'<@]+)(?::([^/?#\s)"'<@]*))?@/gi,
      "$1[redacted]@",
    )
    .replace(
      /(\bAuthorization\s*[:=]?\s*Bearer\s+)[a-zA-Z0-9._-]+/gi,
      "$1[redacted]",
    )
    .replace(
      /(\bAuthorization\s*[=:]\s*)(?!Bearer\s+\[redacted\])[^&#\s)"'<]+/gi,
      "$1[redacted]",
    )
    .replace(/(\bBearer\s+)[a-zA-Z0-9._-]+/gi, "$1[redacted]")
    .replace(
      new RegExp(`([?&#](?:${apiSecretKeyPattern})=)[^&#\\s)"']+`, "gi"),
      "$1[redacted]",
    )
    .replace(
      new RegExp(
        `(\\b(?:${apiSecretKeyPattern})\\b\\s*[=:]\\s*)[^&#\\s)"'<;,]+`,
        "gi",
      ),
      "$1[redacted]",
    );
}
