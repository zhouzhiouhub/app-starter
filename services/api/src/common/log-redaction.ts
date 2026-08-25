import {
  isSensitiveSecretLikeKey,
  sensitiveCredentialKeyPatternSource,
  sensitiveUrlParameterKeyPatternSource,
} from "@app-starter/schema";

const logSecretKeyPattern = sensitiveCredentialKeyPatternSource;
const logUrlParameterKeyPattern = sensitiveUrlParameterKeyPatternSource;

const pemBlockPattern =
  /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g;

const redactedPemValue = "[redacted-pem]";
const redactedValue = "[redacted]";

export function redactLogSecrets(value: unknown): string {
  return String(value)
    .replace(pemBlockPattern, redactedPemValue)
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
      /(\bAuthorization\s*[=:]\s*)(?![a-z][a-z0-9+.-]*\s+\[redacted\])[^&#\s)"'<;,]+/gi,
      "$1[redacted]",
    )
    .replace(/(\bBearer\s+)[a-zA-Z0-9._-]+/gi, "$1[redacted]")
    .replace(
      new RegExp(
        `([?&#](?:${logUrlParameterKeyPattern})=)[^&#\\s)"']+`,
        "gi",
      ),
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
  return isSensitiveSecretLikeKey(key);
}
