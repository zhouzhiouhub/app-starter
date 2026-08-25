import {
  DEFAULT_MEDIA_CDN_BASE_URL,
  DEFAULT_MEDIA_UPLOAD_BASE_URL,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
} from "./media.constants.js";
import { createMediaObjectUrl } from "./media.object-url.js";
import {
  isProductionMediaEnvironment,
  type MediaProductionEnvironment,
} from "./media.production-env.js";
import { createR2PresignedPutUrl } from "./media.r2-presign.js";

export type MediaUploadTarget = {
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: Date;
};

type R2UploadConfig = Required<
  Pick<
    R2UploadEnv,
    "R2_ACCESS_KEY_ID" | "R2_ACCOUNT_ID" | "R2_BUCKET" | "R2_SECRET_ACCESS_KEY"
  >
> & {
  R2_REGION: string;
};

export type R2UploadEnv = MediaProductionEnvironment & {
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
  const isProduction = isProductionMediaEnvironment(env);
  const r2Config = readR2UploadConfig(env);

  if (r2Config) {
    return {
      uploadUrl: createR2PresignedPutUrl({
        accessKeyId: r2Config.R2_ACCESS_KEY_ID,
        accountId: r2Config.R2_ACCOUNT_ID,
        bucket: r2Config.R2_BUCKET,
        mimeType: input.mimeType,
        now,
        r2Key: input.r2Key,
        region: r2Config.R2_REGION,
        secretAccessKey: r2Config.R2_SECRET_ACCESS_KEY,
        ttlSeconds,
      }),
      headers: {
        "Content-Type": input.mimeType,
      },
      expiresAt,
    };
  }

  if (isProduction) {
    throw new MediaUploadConfigurationError();
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
  const isProduction = isProductionMediaEnvironment(env);
  const baseUrls = isProduction
    ? [env.MEDIA_CDN_BASE_URL]
    : [env.MEDIA_CDN_BASE_URL, env.CDN_BASE_URL];

  return createMediaObjectUrl({
    allowFallback: !isProduction,
    baseUrls,
    fallbackBaseUrl: DEFAULT_MEDIA_CDN_BASE_URL,
    fallbackMessage:
      "MEDIA_CDN_BASE_URL must be configured as a safe CDN URL in production.",
    objectKey: r2Key,
    requireProductionSafeBaseUrl: isProduction,
  });
}

export class MediaUploadConfigurationError extends Error {
  constructor(message = "R2 upload configuration is required in production.") {
    super(message);
  }
}

function readR2UploadConfig(env: R2UploadEnv): R2UploadConfig | null {
  const config = {
    R2_ACCESS_KEY_ID: readR2EnvValue(env.R2_ACCESS_KEY_ID),
    R2_ACCOUNT_ID: readR2EnvValue(env.R2_ACCOUNT_ID),
    R2_BUCKET: readR2EnvValue(env.R2_BUCKET),
    R2_REGION: readR2EnvValue(env.R2_REGION) ?? "auto",
    R2_SECRET_ACCESS_KEY: readR2EnvValue(env.R2_SECRET_ACCESS_KEY),
  };
  const requiredValues = [
    config.R2_ACCESS_KEY_ID,
    config.R2_ACCOUNT_ID,
    config.R2_BUCKET,
    config.R2_SECRET_ACCESS_KEY,
  ];

  if (requiredValues.every((value) => !value)) {
    return null;
  }

  if (
    requiredValues.some((value) => !value) ||
    !isSafeR2AccountId(config.R2_ACCOUNT_ID) ||
    !isSafeR2Bucket(config.R2_BUCKET) ||
    !isSafeR2Credential(config.R2_ACCESS_KEY_ID) ||
    !isSafeR2Credential(config.R2_SECRET_ACCESS_KEY) ||
    !isSafeR2Region(config.R2_REGION)
  ) {
    throw new MediaUploadConfigurationError(
      "R2 upload configuration is invalid.",
    );
  }

  return config as R2UploadConfig;
}

function readR2EnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isSafeR2AccountId(value: string | null): value is string {
  return Boolean(
    value &&
      value.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value),
  );
}

function isSafeR2Bucket(value: string | null): value is string {
  return Boolean(
    value &&
      value.length >= 3 &&
      value.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value) &&
      !value.includes("..") &&
      !value.includes(".-") &&
      !value.includes("-.") &&
      !isIpv4AddressLike(value),
  );
}

function isIpv4AddressLike(value: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

function isSafeR2Credential(value: string | null): value is string {
  return Boolean(
    value &&
      value.length <= 4096 &&
      !/\s/.test(value) &&
      !hasControlCharacter(value),
  );
}

function isSafeR2Region(value: string | null): value is string {
  return Boolean(
    value &&
      value.length <= 64 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(value),
  );
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
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
