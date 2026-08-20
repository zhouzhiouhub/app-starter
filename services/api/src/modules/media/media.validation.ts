import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { z, ZodError } from "zod";
import {
  DEFAULT_MEDIA_CDN_BASE_URL,
  MEDIA_ALLOWED_MIME_TYPES,
  MEDIA_MAX_UPLOAD_BYTES,
} from "./media.constants.js";

const filenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine((value) => !/[\\/\0]/.test(value), {
    message: "Filename cannot contain slashes.",
  });

const mimeTypeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value): value is (typeof MEDIA_ALLOWED_MIME_TYPES)[number] =>
      MEDIA_ALLOWED_MIME_TYPES.includes(
        value as (typeof MEDIA_ALLOWED_MIME_TYPES)[number],
      ),
    {
      message: "File type is not allowed.",
    },
  );

const sizeSchema = z.coerce.number().int().min(1).max(MEDIA_MAX_UPLOAD_BYTES);

const mediaTypeSchema = z.enum(["image", "video", "pdf", "other"]);
const mediaStatusSchema = z.enum(["active", "archived", "all"]);

const r2KeySchema = z
  .string()
  .trim()
  .min(1)
  .max(1024)
  .refine((value) => !value.startsWith("/") && !value.includes(".."), {
    message: "R2 key must be a relative object key.",
  })
  .refine((value) => /^[a-zA-Z0-9/_.,=@+-]+$/.test(value), {
    message: "R2 key contains unsupported characters.",
  });

const mediaUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => /^https?:\/\//.test(value), {
    message: "Media URL must be http(s).",
  });

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: mediaTypeSchema.optional(),
  status: mediaStatusSchema.default("active"),
});

export const createUploadUrlInputSchema = z.object({
  filename: filenameSchema,
  mimeType: mimeTypeSchema,
  size: sizeSchema,
});

export const confirmMediaInputSchema = createUploadUrlInputSchema.extend({
  r2Key: r2KeySchema,
  url: mediaUrlSchema.optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type CreateUploadUrlInput = z.infer<typeof createUploadUrlInputSchema>;
export type ConfirmMediaInput = z.infer<typeof confirmMediaInputSchema>;

export function parseListMediaQuery(query: {
  page?: string | number;
  limit?: string | number;
  status?: string;
  type?: string;
}) {
  return parseOrThrow(() => listMediaQuerySchema.parse(query));
}

export function parseCreateUploadUrlInput(body: unknown): CreateUploadUrlInput {
  return parseOrThrow(() =>
    createUploadUrlInputSchema.parse(unwrapBodyData(body)),
  );
}

export function parseConfirmMediaInput(body: unknown): ConfirmMediaInput {
  return parseOrThrow(() =>
    confirmMediaInputSchema.parse(unwrapBodyData(body)),
  );
}

export function assertTenantR2Key(r2Key: string, tenantId: string) {
  if (!r2Key.startsWith(`${tenantId}/`)) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "R2 key does not belong to the current tenant.",
    });
  }
}

export function assertAllowedMediaUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertAllowedMediaUrlHost(url, readAllowedMediaUrlHosts(env), {
    message: "Media URL host is not allowed.",
  });
}

export function assertAllowedExternalMediaUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertAllowedMediaUrlHost(url, readExternalMediaUrlHosts(env), {
    message: "External media URL host is not allowed.",
  });
}

function assertAllowedMediaUrlHost(
  url: string,
  allowedHosts: Set<string>,
  input: { message: string },
) {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Media URL must be http(s).",
    });
  }

  if (parsed.username || parsed.password) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Media URL must not include credentials.",
    });
  }

  assertAllowedHost(parsed.hostname, allowedHosts, input.message);
}

export function readAllowedMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set([
    ...readExternalMediaUrlHosts(env),
    ...readManagedMediaUrlHosts(env),
  ]);
}

export function readExternalMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(readHostsFromList(env.MEDIA_EXTERNAL_URL_HOSTS));
}

export function readManagedMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(
    [
      readSafeHostFromHttpUrl(env.MEDIA_CDN_BASE_URL),
      readSafeHostFromHttpUrl(env.CDN_BASE_URL),
      readSafeHostFromHttpUrl(DEFAULT_MEDIA_CDN_BASE_URL),
    ].filter((host): host is string => Boolean(host)),
  );
}

function unwrapBodyData(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const record = body as Record<string, unknown>;
  const data = record.data ?? record;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Request body data must be an object.");
  }

  return data as Record<string, unknown>;
}

function parseOrThrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.issues[0]?.message ?? "Invalid request.",
        details: error.flatten(),
      });
    }

    if (error instanceof Error && error.message.startsWith("Request body")) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.message,
      });
    }

    throw error;
  }
}

function readHostsFromList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => readHostFromUrlOrHost(item.trim()))
    .filter((host): host is string => Boolean(host));
}

function readHostFromUrlOrHost(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return readSafeHostFromHttpUrl(value) ?? readHostFromBareValue(value);
}

function readSafeHostFromHttpUrl(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function readHostFromBareValue(value: string): string | undefined {
  if (!value || /[/?#\\@]/.test(value)) {
    return undefined;
  }

  try {
    return new URL(`https://${value}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function assertAllowedHost(
  hostname: string,
  allowedHosts: Set<string>,
  message: string,
) {
  if (allowedHosts.has(hostname.toLowerCase())) {
    return;
  }

  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message,
    details: {
      host: hostname,
    },
  });
}
