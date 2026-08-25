import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { z, ZodError } from "zod";
import {
  MEDIA_ALLOWED_MIME_TYPES,
  MEDIA_MAX_UPLOAD_BYTES,
} from "./media.constants.js";

export {
  assertAllowedExternalMediaUrl,
  assertAllowedMediaUrl,
  readAllowedMediaUrlHosts,
  readExternalMediaUrlHosts,
  readManagedMediaUrlHosts,
} from "./media.url-validation.js";

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

const httpMediaUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//.test(value), {
    message: "Media URL must be http(s).",
  });

const mediaUrlSchema = z
  .string()
  .superRefine((value, context) => {
    if (hasControlCharacter(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Media URL must not contain control characters.",
      });
    }
  })
  .transform((value) => value.trim())
  .pipe(httpMediaUrlSchema);
const reservedMediaMetadataFields = new Set(["archivedAt", "archivedBy"]);
const mediaMetadataSchema = z
  .record(z.unknown())
  .default({})
  .superRefine((metadata, context) => {
    const reservedField = Object.keys(metadata).find((field) =>
      reservedMediaMetadataFields.has(field),
    );

    if (reservedField) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Media metadata field ${reservedField} is reserved.`,
      });
    }
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
  metadata: mediaMetadataSchema,
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

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
