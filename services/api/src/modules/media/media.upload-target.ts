import { createHash, createHmac } from "node:crypto";
import {
  DEFAULT_MEDIA_CDN_BASE_URL,
  DEFAULT_MEDIA_UPLOAD_BASE_URL,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
} from "./media.constants.js";

export type MediaUploadTarget = {
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: Date;
};

export type R2UploadEnv = {
  CDN_BASE_URL?: string;
  MEDIA_CDN_BASE_URL?: string;
  MEDIA_UPLOAD_BASE_URL?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_BUCKET?: string;
  R2_REGION?: string;
  R2_SECRET_ACCESS_KEY?: string;
};

export function createMediaUploadTarget(input: {
  mimeType: string;
  now?: Date;
  r2Key: string;
  ttlSeconds?: number;
  env?: R2UploadEnv;
}): MediaUploadTarget {
  const env = input.env ?? process.env;
  const ttlSeconds = readMediaUploadTargetTtlSeconds(input.ttlSeconds);
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  if (hasR2UploadConfig(env)) {
    return {
      uploadUrl: createR2PresignedPutUrl({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        accountId: env.R2_ACCOUNT_ID,
        bucket: env.R2_BUCKET,
        mimeType: input.mimeType,
        now,
        r2Key: input.r2Key,
        region: env.R2_REGION ?? "auto",
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        ttlSeconds,
      }),
      headers: {
        "Content-Type": input.mimeType,
      },
      expiresAt,
    };
  }

  return {
    uploadUrl: buildObjectUrl(
      readSafeMediaBaseUrl(
        [env.MEDIA_UPLOAD_BASE_URL],
        DEFAULT_MEDIA_UPLOAD_BASE_URL,
      ),
      input.r2Key,
    ),
    headers: {
      "Content-Type": input.mimeType,
    },
    expiresAt,
  };
}

export function createMediaCdnUrl(
  r2Key: string,
  env: R2UploadEnv = process.env,
) {
  return buildObjectUrl(
    readSafeMediaBaseUrl(
      [env.MEDIA_CDN_BASE_URL, env.CDN_BASE_URL],
      DEFAULT_MEDIA_CDN_BASE_URL,
    ),
    r2Key,
  );
}

function createR2PresignedPutUrl(input: {
  accessKeyId: string;
  accountId: string;
  bucket: string;
  mimeType: string;
  now: Date;
  r2Key: string;
  region: string;
  secretAccessKey: string;
  ttlSeconds: number;
}) {
  const host = `${input.accountId}.r2.cloudflarestorage.com`;
  const credentialDate = toCredentialDate(input.now);
  const timestamp = toAmzDate(input.now);
  const credentialScope = `${credentialDate}/${input.region}/s3/aws4_request`;
  const canonicalUri = `/${encodePathSegment(input.bucket)}/${encodeObjectKey(
    input.r2Key,
  )}`;
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": timestamp,
    "X-Amz-Expires": String(input.ttlSeconds),
    "X-Amz-SignedHeaders": "content-type;host",
  });
  const canonicalQuery = canonicalizeQuery(query);
  const canonicalHeaders = `content-type:${input.mimeType}\nhost:${host}\n`;
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = hmacHex(
    getSigningKey(input.secretAccessKey, credentialDate, input.region, "s3"),
    stringToSign,
  );

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function hasR2UploadConfig(
  env: R2UploadEnv,
): env is Required<
  Pick<
    R2UploadEnv,
    "R2_ACCOUNT_ID" | "R2_ACCESS_KEY_ID" | "R2_BUCKET" | "R2_SECRET_ACCESS_KEY"
  >
> &
  R2UploadEnv {
  return Boolean(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_BUCKET &&
    env.R2_SECRET_ACCESS_KEY,
  );
}

function readMediaUploadTargetTtlSeconds(value: number | undefined): number {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MEDIA_UPLOAD_URL_TTL_SECONDS
  ) {
    return value;
  }

  return MEDIA_UPLOAD_URL_TTL_SECONDS;
}

function buildObjectUrl(baseUrl: string, objectKey: string): string {
  const base = trimTrailingSlashes(baseUrl);
  return `${base}/${encodeObjectKey(objectKey)}`;
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

function encodeObjectKey(objectKey: string): string {
  return objectKey.split("/").map(encodePathSegment).join("/");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalizeQuery(query: URLSearchParams): string {
  return [...query.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) => `${encodePathSegment(key)}=${encodePathSegment(value)}`,
    )
    .join("&");
}

function getSigningKey(
  secretAccessKey: string,
  credentialDate: string,
  region: string,
  service: string,
) {
  const dateKey = hmacBuffer(`AWS4${secretAccessKey}`, credentialDate);
  const regionKey = hmacBuffer(dateKey, region);
  const serviceKey = hmacBuffer(regionKey, service);
  return hmacBuffer(serviceKey, "aws4_request");
}

function hmacBuffer(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toCredentialDate(date: Date): string {
  return toAmzDate(date).slice(0, 8);
}
