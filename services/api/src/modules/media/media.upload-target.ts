import {
  DEFAULT_MEDIA_CDN_BASE_URL,
  DEFAULT_MEDIA_UPLOAD_BASE_URL,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
} from "./media.constants.js";
import { createMediaObjectUrl } from "./media.object-url.js";
import { createR2PresignedPutUrl } from "./media.r2-presign.js";

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
    uploadUrl: createMediaObjectUrl({
      baseUrls: [env.MEDIA_UPLOAD_BASE_URL],
      fallbackBaseUrl: DEFAULT_MEDIA_UPLOAD_BASE_URL,
      objectKey: input.r2Key,
    }),
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
  return createMediaObjectUrl({
    baseUrls: [env.MEDIA_CDN_BASE_URL, env.CDN_BASE_URL],
    fallbackBaseUrl: DEFAULT_MEDIA_CDN_BASE_URL,
    objectKey: r2Key,
  });
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
