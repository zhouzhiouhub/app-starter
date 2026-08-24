import { hasSensitiveMediaUrlQueryParameters } from "./media-url-sensitive-parameters.ts";

const unsafeMediaAssetUrlCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);

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
    hasSensitiveMediaUrlQueryParameters(parsed)
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
