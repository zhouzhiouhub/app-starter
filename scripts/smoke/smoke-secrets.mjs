import {
  isSensitiveSecretLikeKey,
  sensitiveCredentialKeyPatternSource,
  sensitiveUrlParameterKeyPatternSource,
} from "@app-starter/schema";

const secretKeyPattern = sensitiveCredentialKeyPatternSource;
const secretUrlParameterKeyPattern = sensitiveUrlParameterKeyPatternSource;
const pemBlockPattern =
  /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;

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
      new RegExp(
        `([?&#](?:${secretUrlParameterKeyPattern})=)[^&#\\s)"']+`,
        "gi",
      ),
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
  return isSensitiveSecretLikeKey(key);
}
