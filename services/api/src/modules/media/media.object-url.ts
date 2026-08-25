import { isUnsafeProductionHostname } from "@app-starter/schema";
import { encodeMediaObjectKey } from "./media.object-key.js";

const mediaBaseUrlFilePathPattern =
  /\.(?:avif|bmp|css|gif|html?|ico|jpe?g|js|json|m4v|mov|mp4|pdf|png|svg|txt|webm|webp|xml|zip)$/i;

export function createMediaObjectUrl(input: {
  allowFallback?: boolean;
  baseUrls: Array<string | undefined>;
  fallbackBaseUrl: string;
  fallbackMessage?: string;
  objectKey: string;
  requireProductionSafeBaseUrl?: boolean;
}): string {
  const baseUrl = readSafeMediaBaseUrl(input.baseUrls, {
    requireProductionSafeBaseUrl: input.requireProductionSafeBaseUrl,
  });

  if (!baseUrl && input.allowFallback === false) {
    throw new MediaRuntimeConfigurationError(input.fallbackMessage);
  }

  return buildObjectUrl(baseUrl ?? input.fallbackBaseUrl, input.objectKey);
}

export class MediaRuntimeConfigurationError extends Error {
  constructor(message = "Media runtime configuration is incomplete.") {
    super(message);
  }
}

function buildObjectUrl(baseUrl: string, objectKey: string): string {
  const base = trimTrailingSlashes(baseUrl);
  return `${base}/${encodeMediaObjectKey(objectKey)}`;
}

function readSafeMediaBaseUrl(
  values: Array<string | undefined>,
  options: { requireProductionSafeBaseUrl?: boolean },
): string | null {
  for (const value of values) {
    const url = readSafeHttpUrl(value, options);

    if (url) {
      return `${url.origin}${trimTrailingSlashes(url.pathname)}`;
    }
  }

  return null;
}

function readSafeHttpUrl(
  value: string | undefined,
  options: { requireProductionSafeBaseUrl?: boolean },
): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !isHttpProtocol(url.protocol) ||
      (options.requireProductionSafeBaseUrl && url.protocol !== "https:") ||
      (options.requireProductionSafeBaseUrl &&
        isUnsafeProductionHostname(url.hostname)) ||
      url.username ||
      url.password ||
      hasFileLikeBaseUrlPath(url.pathname) ||
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

function hasFileLikeBaseUrlPath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/+$/g, "");

  if (!trimmed || trimmed === "/") {
    return false;
  }

  const lastSegment = trimmed.split("/").pop() ?? "";
  const decodedSegment = decodePathSegment(lastSegment);

  return mediaBaseUrlFilePathPattern.test(decodedSegment);
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}
