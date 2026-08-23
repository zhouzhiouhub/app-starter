import { MEDIA_MAX_UPLOAD_BYTES } from "./constants.ts";
import type { MediaAssetType, MediaUploadTarget } from "./types";

const maxMediaUploadUrlLength = 4096;
const maxMediaUploadR2KeyLength = 2048;
const uploadHeaderNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const forbiddenUploadHeaderNames = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
]);
const mediaUploadTargetError = "Upload URL could not be prepared.";
const mediaUploadTypes = new Set<MediaAssetType>([
  "image",
  "video",
  "pdf",
  "other",
]);

export function readMediaUploadTargetResponse(
  value: unknown,
): MediaUploadTarget {
  if (!isRecord(value)) {
    throw new Error(mediaUploadTargetError);
  }

  const uploadUrl = readSafeMediaUploadUrl(value.uploadUrl);
  const method = value.method === "PUT" ? "PUT" : null;
  const r2Key = readBoundedString(value.r2Key, maxMediaUploadR2KeyLength);
  const type = readMediaUploadType(value.type);
  const headers = readUploadHeaders(value.headers);
  const maxSize = readMaxSize(value.maxSize);
  const expiresAt = readTimestamp(value.expiresAt);
  const confirmPath =
    value.confirmPath === "/api/v1/media/confirm" ? value.confirmPath : null;

  if (
    !uploadUrl ||
    !method ||
    !r2Key ||
    !type ||
    !headers ||
    !maxSize ||
    !expiresAt ||
    !confirmPath
  ) {
    throw new Error(mediaUploadTargetError);
  }

  return {
    uploadUrl,
    method,
    r2Key,
    type,
    headers,
    maxSize,
    expiresAt,
    confirmPath,
  };
}

function readSafeMediaUploadUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const url = value.trim();

  if (
    !url ||
    url.length > maxMediaUploadUrlLength ||
    hasUnsafeUrlCharacter(url)
  ) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (
      !isAllowedUploadProtocol(parsed) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function isAllowedUploadProtocol(url: URL): boolean {
  if (url.protocol === "https:") {
    return true;
  }

  return url.protocol === "http:" && isLocalHttpHost(url.hostname);
}

function isLocalHttpHost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    hostname.toLowerCase(),
  );
}

function readBoundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value.trim() !== value) {
    return null;
  }

  if (!value || value.length > maxLength || hasControlCharacter(value)) {
    return null;
  }

  return value;
}

function readMediaUploadType(value: unknown): MediaAssetType | null {
  return typeof value === "string" && mediaUploadTypes.has(value as MediaAssetType)
    ? (value as MediaAssetType)
    : null;
}

function readUploadHeaders(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) {
    return null;
  }

  const headers: Record<string, string> = {};

  for (const [name, headerValue] of Object.entries(value)) {
    if (!isSafeUploadHeader(name, headerValue)) {
      return null;
    }

    headers[name] = headerValue;
  }

  return headers;
}

function isSafeUploadHeader(name: string, value: unknown): value is string {
  return (
    typeof value === "string" &&
    uploadHeaderNamePattern.test(name) &&
    !forbiddenUploadHeaderNames.has(name.toLowerCase()) &&
    !hasControlCharacter(value)
  );
}

function readMaxSize(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MEDIA_MAX_UPLOAD_BYTES
    ? value
    : null;
}

function readTimestamp(value: unknown): string | null {
  return typeof value === "string" &&
    value.trim() === value &&
    Number.isFinite(Date.parse(value))
    ? value
    : null;
}

function hasUnsafeUrlCharacter(value: string): boolean {
  return (
    hasControlCharacter(value) ||
    Array.from(value).some((character) =>
      ["<", ">", '"', "'", "`", "\\"].includes(character),
    )
  );
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x20 || codePoint === 0x7f;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
