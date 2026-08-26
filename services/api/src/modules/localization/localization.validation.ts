import { BadRequestException, ConflictException } from "@nestjs/common";
import {
  apiErrorCodes,
  localeCodeSchema,
  publicTranslationMessageMaxLength,
  translationContextMaxLength,
  translationKeySchema,
} from "@app-starter/schema";
import { z, ZodError } from "zod";
import { isMultiLocaleEnabled } from "../../common/feature-flags.js";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";

const createLocaleInputSchema = z.object({
  code: localeCodeSchema,
});
const upsertTranslationInputSchema = z.object({
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

export type CreateLocaleInput = z.infer<typeof createLocaleInputSchema>;
export type UpsertTranslationInput = z.infer<
  typeof upsertTranslationInputSchema
>;

export function parseCreateLocaleInput(body: unknown): CreateLocaleInput {
  return parseOrThrow(() =>
    createLocaleInputSchema.parse(unwrapBodyData(body)),
  );
}

export function parseUpsertTranslationInput(
  body: unknown,
): UpsertTranslationInput {
  return parseOrThrow(() =>
    upsertTranslationInputSchema.parse(unwrapBodyData(body)),
  );
}

export function readDefaultLocale(
  env: Record<string, string | undefined> = process.env,
): string {
  return readApiRuntimeDefaults(env).locale;
}

export function readFallbackLocale(
  env: Record<string, string | undefined> = process.env,
): string {
  return readApiRuntimeDefaults(env).fallbackLocale;
}

export function resolveTranslationLocale(
  locale: string | undefined,
  env: Record<string, string | undefined> = process.env,
): {
  defaultLocale: string;
  fallbackLocale: string;
  isFallback: boolean;
  locale: string;
} {
  const defaults = readApiRuntimeDefaults(env);
  const defaultLocale = defaults.locale;
  const requestedLocale = locale ?? defaultLocale;
  const parsed = localeCodeSchema.safeParse(requestedLocale);

  if (!parsed.success) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Locale must look like en-US.",
    });
  }

  const isFallback =
    !isMultiLocaleEnabled(env) && parsed.data !== defaultLocale;

  return {
    defaultLocale,
    fallbackLocale: defaults.fallbackLocale,
    isFallback,
    locale: isFallback ? defaultLocale : parsed.data,
  };
}

export function resolveWritableTranslationLocale(
  locale: string | undefined,
  env: Record<string, string | undefined> = process.env,
) {
  const defaults = readApiRuntimeDefaults(env);
  const defaultLocale = defaults.locale;
  const requestedLocale = locale ?? defaultLocale;
  const parsed = localeCodeSchema.safeParse(requestedLocale);

  if (!parsed.success) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Locale must look like en-US.",
    });
  }

  if (!isMultiLocaleEnabled(env) && parsed.data !== defaultLocale) {
    throw new ConflictException({
      code: apiErrorCodes.MULTI_LOCALE_DISABLED,
      message:
        "Cannot write non-default Locale translations while multi-locale is disabled.",
    });
  }

  return {
    defaultLocale,
    fallbackLocale: defaults.fallbackLocale,
    locale: parsed.data,
  };
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

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
