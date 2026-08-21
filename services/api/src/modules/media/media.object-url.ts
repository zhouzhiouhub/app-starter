import { encodeMediaObjectKey } from "./media.object-key.js";

export function createMediaObjectUrl(input: {
  baseUrls: Array<string | undefined>;
  fallbackBaseUrl: string;
  objectKey: string;
}): string {
  return buildObjectUrl(
    readSafeMediaBaseUrl(input.baseUrls, input.fallbackBaseUrl),
    input.objectKey,
  );
}

function buildObjectUrl(baseUrl: string, objectKey: string): string {
  const base = trimTrailingSlashes(baseUrl);
  return `${base}/${encodeMediaObjectKey(objectKey)}`;
}

function readSafeMediaBaseUrl(
  values: Array<string | undefined>,
  fallback: string,
): string {
  for (const value of values) {
    const url = readSafeHttpUrl(value);

    if (url) {
      return `${url.origin}${trimTrailingSlashes(url.pathname)}`;
    }
  }

  return fallback;
}

function readSafeHttpUrl(value: string | undefined): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !isHttpProtocol(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function trimTrailingSlashes(value: string): string {
  const trimmed = value.replace(/\/+$/g, "");
  return trimmed || "/";
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}
