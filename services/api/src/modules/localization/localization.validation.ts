import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  defaultRuntimeConfig,
  localeCodeSchema,
} from "@app-starter/schema";
import { z, ZodError } from "zod";

const createLocaleInputSchema = z.object({
  code: localeCodeSchema,
});

export type CreateLocaleInput = z.infer<typeof createLocaleInputSchema>;

export function parseCreateLocaleInput(body: unknown): CreateLocaleInput {
  return parseOrThrow(() =>
    createLocaleInputSchema.parse(unwrapBodyData(body)),
  );
}

export function readDefaultLocale(
  env: Record<string, string | undefined> = process.env,
): string {
  return readLocaleEnvValue(
    env.DEFAULT_LOCALE,
    defaultRuntimeConfig.defaultLocale,
  );
}

export function readFallbackLocale(
  env: Record<string, string | undefined> = process.env,
): string {
  return readLocaleEnvValue(
    env.FALLBACK_LOCALE,
    defaultRuntimeConfig.fallbackLocale,
  );
}

export function resolveTranslationLocale(
  locale: string | undefined,
  env: Record<string, string | undefined> = process.env,
): {
  defaultLocale: string;
  isFallback: boolean;
  locale: string;
} {
  const defaultLocale = readDefaultLocale(env);
  const requestedLocale = locale ?? defaultLocale;
  const parsed = localeCodeSchema.safeParse(requestedLocale);

  if (!parsed.success) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Locale must look like en-US.",
    });
  }

  const isFallback =
    env.MULTI_LOCALE_ENABLED !== "true" && parsed.data !== defaultLocale;

  return {
    defaultLocale,
    isFallback,
    locale: isFallback ? defaultLocale : parsed.data,
  };
}

function readLocaleEnvValue(
  value: string | undefined,
  fallback: string,
): string {
  const parsed = localeCodeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
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
