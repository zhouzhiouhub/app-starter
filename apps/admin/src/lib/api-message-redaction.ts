import {
  sensitiveCredentialKeyPatternSource,
  sensitiveUrlParameterKeyPatternSource,
} from "@app-starter/schema";

const apiSecretKeyPattern = sensitiveCredentialKeyPatternSource;
const apiUrlParameterKeyPattern = sensitiveUrlParameterKeyPatternSource;
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
      new RegExp(
        `([?&#](?:${apiUrlParameterKeyPattern})=)[^&#\\s)"']+`,
        "gi",
      ),
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
        `(\\b(?:${apiSecretKeyPattern})\\b\\s*[=:]\\s*)(?!\\[redacted(?:-pem)?\\])[^&#\\s)"'<;,]+`,
        "gi",
      ),
      "$1[redacted]",
    );
}
