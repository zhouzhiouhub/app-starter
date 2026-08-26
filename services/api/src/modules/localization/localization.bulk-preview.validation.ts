import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  localeCodeSchema,
  publicTranslationMessageMaxLength,
  translationBulkPreviewMaxEntries,
  translationContextMaxLength,
  translationKeySchema,
  translationNamespaceSchema,
  translationSearchMaxLength,
} from "@app-starter/schema";
import { z, ZodError } from "zod";

const translationImportPreviewInputSchema = z.object({
  entries: z.array(z.unknown()).max(translationBulkPreviewMaxEntries),
});
const translationImportPreviewEntrySchema = z.object({
  context: z
    .string()
    .max(translationContextMaxLength)
    .refine(
      (value) => !hasControlCharacter(value),
      "Context must not contain control characters.",
    )
    .nullable()
    .optional(),
  key: translationKeySchema,
  locale: localeCodeSchema.optional(),
  value: z
    .string()
    .min(1)
    .max(publicTranslationMessageMaxLength)
    .refine(
      (value) => !hasControlCharacter(value),
      "Value must not contain control characters.",
    ),
});
const translationExportPreviewInputSchema = z.object({
  locale: z.preprocess(normalizeOptionalText, localeCodeSchema.optional()),
  namespace: z.preprocess(
    normalizeOptionalText,
    translationNamespaceSchema.optional(),
  ),
  q: z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .max(translationSearchMaxLength)
      .refine(
        (value) => !hasControlCharacter(value),
        "Search query must not contain control characters.",
      )
      .optional(),
  ),
});

export type TranslationImportPreviewInput = z.infer<
  typeof translationImportPreviewInputSchema
>;
export type TranslationImportPreviewEntry = z.infer<
  typeof translationImportPreviewEntrySchema
>;
export type TranslationExportPreviewInput = z.infer<
  typeof translationExportPreviewInputSchema
>;

export interface TranslationPreviewIssue {
  code: string;
  field?: string;
  message: string;
}

export function parseTranslationImportPreviewInput(
  body: unknown,
): TranslationImportPreviewInput {
  return parseOrThrow(() =>
    translationImportPreviewInputSchema.parse(unwrapBodyData(body)),
  );
}

export function parseTranslationExportPreviewInput(
  body: unknown,
): TranslationExportPreviewInput {
  return parseOrThrow(() =>
    translationExportPreviewInputSchema.parse(unwrapBodyData(body)),
  );
}

export function parseTranslationImportPreviewEntry(entry: unknown): {
  data?: TranslationImportPreviewEntry;
  issues: TranslationPreviewIssue[];
} {
  const data = unwrapEntryData(entry);

  if (!data) {
    return {
      issues: [
        {
          code: apiErrorCodes.VALIDATION_ERROR,
          message: "Translation import entry must be an object.",
        },
      ],
    };
  }

  const result = translationImportPreviewEntrySchema.safeParse(data);

  if (!result.success) {
    return {
      issues: result.error.issues.map(toTranslationPreviewIssue),
    };
  }

  return { data: result.data, issues: [] };
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

function unwrapEntryData(entry: unknown): Record<string, unknown> | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  return entry as Record<string, unknown>;
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

function toTranslationPreviewIssue(issue: z.ZodIssue): TranslationPreviewIssue {
  return {
    code: apiErrorCodes.VALIDATION_ERROR,
    field: issue.path.join(".") || undefined,
    message: issue.message,
  };
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
