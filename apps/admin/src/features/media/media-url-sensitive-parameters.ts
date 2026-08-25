const sensitiveMediaUrlQueryKeySuffixes = [
  "accesskeyid",
  "accesstoken",
  "apikey",
  "authcode",
  "authorizationcode",
  "clientsecret",
  "codeverifier",
  "credential",
  "keypairid",
  "oauthcode",
  "oauthverifier",
  "password",
  "previewtoken",
  "refreshtoken",
  "secret",
  "session",
  "signature",
  "token",
];

const sensitiveMediaUrlQueryKeys = new Set([
  "policy",
  "sig",
  ...sensitiveMediaUrlQueryKeySuffixes,
]);

export function hasSensitiveMediaUrlQueryParameters(url: URL): boolean {
  return Array.from(url.searchParams.keys()).some(isSensitiveMediaUrlQueryKey);
}

function isSensitiveMediaUrlQueryKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return (
    normalized.startsWith("xamz") ||
    sensitiveMediaUrlQueryKeys.has(normalized) ||
    sensitiveMediaUrlQueryKeySuffixes.some((suffix) =>
      normalized.endsWith(suffix),
    )
  );
}
