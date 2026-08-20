import { createHmac, timingSafeEqual } from "node:crypto";

const defaultPreviewTokenTtlSeconds = 60 * 60;
const maxPreviewTokenTtlSeconds = defaultPreviewTokenTtlSeconds;
const maxPreviewTokenLength = 2048;
const previewTokenSignatureLength = 43;
const previewTokenSegmentPattern = /^[A-Za-z0-9_-]+$/;
const localPreviewTokenSecret = "local-dev-preview-token-secret";

export class PreviewTokenConfigurationError extends Error {
  constructor() {
    super("PREVIEW_TOKEN_SECRET is required in production.");
  }
}

export interface PagePreviewTokenPayload {
  exp: number;
  iat: number;
  pageId: string;
  slug: string;
  tenantId: string;
  version: 1;
}

export function createPagePreviewToken(input: {
  env?: NodeJS.ProcessEnv;
  now?: Date;
  pageId: string;
  slug: string;
  tenantId: string;
}): { expiresAt: Date; token: string } {
  const now = input.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + readPreviewTokenTtlSeconds(input.env) * 1000,
  );
  const payload: PagePreviewTokenPayload = {
    exp: toUnixSeconds(expiresAt),
    iat: toUnixSeconds(now),
    pageId: input.pageId,
    slug: input.slug,
    tenantId: input.tenantId,
    version: 1,
  };
  const encodedPayload = encodeJson(payload);

  return {
    expiresAt,
    token: `${encodedPayload}.${sign(
      encodedPayload,
      readPreviewTokenSecret(input.env),
    )}`,
  };
}

export function verifyPagePreviewToken(
  token: string,
  input: {
    env?: NodeJS.ProcessEnv;
    now?: Date;
  } = {},
): PagePreviewTokenPayload | null {
  const parts = readPreviewTokenParts(token);

  if (!parts) {
    return null;
  }

  if (!hasValidSignature(parts.encodedPayload, parts.signature, input.env)) {
    return null;
  }

  const payload = decodeJson(parts.encodedPayload);
  const now = toUnixSeconds(input.now ?? new Date());

  if (!isPreviewTokenPayload(payload) || payload.exp <= now) {
    return null;
  }

  return payload;
}

function readPreviewTokenParts(
  token: string,
): { encodedPayload: string; signature: string } | null {
  if (!token || token.length > maxPreviewTokenLength) {
    return null;
  }

  const [encodedPayload, signature, extra] = token.split(".");

  if (
    !isPreviewTokenSegment(encodedPayload) ||
    !isPreviewTokenSegment(signature) ||
    signature.length !== previewTokenSignatureLength ||
    extra
  ) {
    return null;
  }

  return { encodedPayload, signature };
}

function readPreviewTokenSecret(env = process.env): string {
  const configured = env.PREVIEW_TOKEN_SECRET?.trim();

  if (configured) {
    return configured;
  }

  if (env.NODE_ENV === "production") {
    throw new PreviewTokenConfigurationError();
  }

  return localPreviewTokenSecret;
}

function readPreviousPreviewTokenSecret(
  env = process.env,
): string | null {
  const configured = env.PREVIEW_TOKEN_PREVIOUS_SECRET?.trim();
  return configured || null;
}

function readPreviewTokenVerificationSecrets(env = process.env): string[] {
  return [
    readPreviewTokenSecret(env),
    readPreviousPreviewTokenSecret(env),
  ].filter((secret, index, secrets): secret is string =>
    Boolean(secret && secrets.indexOf(secret) === index),
  );
}

function readPreviewTokenTtlSeconds(env = process.env): number {
  const parsed = Number(env.PREVIEW_TOKEN_TTL_SECONDS);

  if (
    Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= maxPreviewTokenTtlSeconds
  ) {
    return parsed;
  }

  return defaultPreviewTokenTtlSeconds;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function hasValidSignature(
  encodedPayload: string,
  signature: string,
  env = process.env,
): boolean {
  return readPreviewTokenVerificationSecrets(env).some((secret) =>
    safeEqual(signature, sign(encodedPayload, secret)),
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isPreviewTokenSegment(value: string | undefined): value is string {
  return Boolean(value && previewTokenSegmentPattern.test(value));
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function isPreviewTokenPayload(value: unknown): value is PagePreviewTokenPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    record.version === 1 &&
    typeof record.pageId === "string" &&
    typeof record.tenantId === "string" &&
    typeof record.slug === "string" &&
    Number.isInteger(record.iat) &&
    Number.isInteger(record.exp)
  );
}

function toUnixSeconds(value: Date): number {
  return Math.floor(value.getTime() / 1000);
}
