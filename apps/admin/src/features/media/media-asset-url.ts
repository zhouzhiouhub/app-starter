const unsafeMediaAssetUrlCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);
const sensitiveMediaAssetQueryKeySuffixes = [
  "accesskeyid",
  "accesstoken",
  "apikey",
  "clientsecret",
  "credential",
  "keypairid",
  "password",
  "previewtoken",
  "refreshtoken",
  "secret",
  "session",
  "signature",
  "token",
];

const sensitiveMediaAssetQueryKeys = new Set([
  "policy",
  "sig",
  ...sensitiveMediaAssetQueryKeySuffixes,
]);

export function readSafeMediaAssetUrl(value: string): string | null {
  const url = value.trim();

  if (!url || hasUnsafeMediaAssetUrlCharacter(url)) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (
    !isAllowedMediaAssetProtocol(parsed) ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    hasSensitiveMediaAssetQueryParameters(parsed)
  ) {
    return null;
  }

  return parsed.href;
}

function isAllowedMediaAssetProtocol(url: URL): boolean {
  if (url.protocol === "https:") {
    return true;
  }

  return url.protocol === "http:" && url.hostname === "localhost";
}

function hasUnsafeMediaAssetUrlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return (
      codePoint <= 0x20 ||
      codePoint === 0x7f ||
      unsafeMediaAssetUrlCharacters.has(character)
    );
  });
}

function hasSensitiveMediaAssetQueryParameters(url: URL): boolean {
  return Array.from(url.searchParams.keys()).some(isSensitiveMediaAssetQueryKey);
}

function isSensitiveMediaAssetQueryKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return (
    normalized.startsWith("xamz") ||
    sensitiveMediaAssetQueryKeys.has(normalized) ||
    sensitiveMediaAssetQueryKeySuffixes.some((suffix) =>
      normalized.endsWith(suffix),
    )
  );
}
