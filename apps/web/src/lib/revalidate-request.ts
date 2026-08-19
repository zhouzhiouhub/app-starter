import {
  defaultRuntimeConfig,
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  localeCodeSchema,
  marketCodeSchema,
  pageSlugSchema,
} from "@app-starter/schema";

export type RevalidateInput = {
  locale: string;
  market: string;
  slug: string;
};

export type RevalidatePayloadErrorDetails = {
  defaults: RevalidateDefaults;
  fields: string[];
  reason: "invalid-body" | "invalid-fields" | "invalid-json";
};

export type RevalidatePayloadError = {
  code: "VALIDATION_ERROR";
  details: RevalidatePayloadErrorDetails;
  message: string;
};

export type RevalidatePayloadResult =
  | {
      input: RevalidateInput;
      ok: true;
      paths: string[];
      tags: string[];
    }
  | {
      error: RevalidatePayloadError;
      ok: false;
    };

export type RevalidateDefaults = {
  locale: string;
  market: string;
};

type JsonReadable = {
  json(): Promise<unknown>;
};

export async function readRevalidatePayload(
  request: JsonReadable,
  defaults = readRevalidateDefaults(),
): Promise<RevalidatePayloadResult> {
  try {
    return parseRevalidatePayload(await request.json(), defaults);
  } catch {
    return validationError("Revalidation request body must be valid JSON.", {
      defaults,
      fields: ["body"],
      reason: "invalid-json",
    });
  }
}

export function parseRevalidatePayload(
  body: unknown,
  defaults = readRevalidateDefaults(),
): RevalidatePayloadResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return validationError("Revalidation request body must be a JSON object.", {
      defaults,
      fields: ["body"],
      reason: "invalid-body",
    });
  }

  const payload = body as Record<string, unknown>;
  const slug = pageSlugSchema.safeParse(payload.slug);
  const locale = localeCodeSchema.safeParse(payload.locale ?? defaults.locale);
  const market = marketCodeSchema.safeParse(payload.market ?? defaults.market);
  const invalidFields: string[] = [];

  if (!slug.success) {
    invalidFields.push("slug");
  }

  if (!locale.success) {
    invalidFields.push("locale");
  }

  if (!market.success) {
    invalidFields.push("market");
  }

  if (!slug.success || !locale.success || !market.success) {
    return validationError(
      "Revalidation request must include valid slug, locale, and market.",
      {
        defaults,
        fields: invalidFields,
        reason: "invalid-fields",
      },
    );
  }

  const input = {
    locale: locale.data,
    market: market.data,
    slug: slug.data,
  };

  return {
    input,
    ok: true,
    paths: getPublishedPageRevalidationPaths(input),
    tags: getPublishedPageCacheTags(input),
  };
}

export function readRevalidateDefaults(
  env: Record<string, string | undefined> = process.env,
): RevalidateDefaults {
  return {
    locale: env.DEFAULT_LOCALE?.trim() || defaultRuntimeConfig.defaultLocale,
    market: env.DEFAULT_MARKET?.trim() || defaultRuntimeConfig.defaultMarket,
  };
}

function validationError(
  message: string,
  details: RevalidatePayloadErrorDetails,
): RevalidatePayloadResult {
  return {
    error: {
      code: "VALIDATION_ERROR",
      details,
      message,
    },
    ok: false,
  };
}
