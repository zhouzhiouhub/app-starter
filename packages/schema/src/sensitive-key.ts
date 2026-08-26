const sensitiveKeySeparatorPattern = /[-_\s]/g;

const sensitiveCredentialKeyPatterns = [
  "access[-_]?token",
  "access[-_]?key[-_]?id",
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
  "key[-_]?pair[-_]?id",
  "oauth[-_]?code",
  "oauth[-_]?verifier",
  "password",
  "passphrase",
  "pem",
  "preview[-_]?token",
  "private[-_]?key(?:[-_]?pem)?",
  "refresh[-_]?token",
  "secret[-_]?access[-_]?key",
  "secret",
  "sig",
  "session[-_]?id",
  "session",
  "set[-_]?cookie",
  "signature",
  "token",
  "x-amz-[a-z0-9-]+",
];

const sensitiveUrlOnlyKeyPatterns = ["policy"];

const compoundSensitiveCredentialKeyPatterns =
  sensitiveCredentialKeyPatterns.map((pattern) => `[a-z0-9_-]*${pattern}`);

const sensitiveCredentialKeySuffixes = [
  "accesskeyid",
  "accesstoken",
  "apikey",
  "authcode",
  "authorizationcode",
  "clientsecret",
  "codeverifier",
  "connectionstring",
  "credential",
  "cookie",
  "databaseurl",
  "dsn",
  "idtoken",
  "jwt",
  "keypairid",
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
  "secretaccesskey",
  "sig",
  "session",
  "sessionid",
  "signature",
  "token",
];

const sensitiveCredentialKeys = new Set([
  "authorization",
  "setcookie",
  "sig",
  "xamzalgorithm",
  "xamzcredential",
  "xamzdate",
  "xamzexpires",
  "xamzsecuritytoken",
  "xamzsignature",
  "xamzsignedheaders",
  ...sensitiveCredentialKeySuffixes,
]);

const sensitiveUrlParameterKeys = new Set([
  "policy",
  ...sensitiveCredentialKeys,
]);

export const sensitiveCredentialKeyPatternSource =
  [
    ...sensitiveCredentialKeyPatterns,
    ...compoundSensitiveCredentialKeyPatterns,
  ].join("|");

export const sensitiveUrlParameterKeyPatternSource = [
  ...sensitiveCredentialKeyPatterns,
  ...compoundSensitiveCredentialKeyPatterns,
  ...sensitiveUrlOnlyKeyPatterns,
].join("|");

export function normalizeSensitiveKey(key: string): string {
  return key.replace(sensitiveKeySeparatorPattern, "").toLowerCase();
}

export function isSensitiveSecretLikeKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);

  return (
    normalized.startsWith("xamz") ||
    sensitiveCredentialKeys.has(normalized) ||
    sensitiveCredentialKeySuffixes.some((suffix) =>
      normalized.endsWith(suffix),
    )
  );
}

export function isSensitiveUrlParameterKey(key: string): boolean {
  const normalized = normalizeSensitiveKey(key);

  return (
    normalized.startsWith("xamz") ||
    sensitiveUrlParameterKeys.has(normalized) ||
    sensitiveCredentialKeySuffixes.some((suffix) =>
      normalized.endsWith(suffix),
    )
  );
}
