import {
  getPublishedPageRevalidationPaths,
  getStorefrontRevalidationCacheTags,
  localeCodeSchema,
  marketCodeSchema,
  pageSlugSchema,
  readSiteDomainHeader,
} from "@app-starter/schema";
import { readWebRuntimeDefaults } from "./runtime-defaults.ts";

export type RevalidateInput = {
  locale: string;
  market: string;
  siteHost?: string;
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
  fallbackLocale: string;
  locale: string;
  market: string;
};

type JsonReadable = {
  json(): Promise<unknown>;
};

type RevalidateSiteHostResult =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
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
  const siteHost = readRevalidateSiteHost(payload.siteHost);
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

  if (!siteHost.ok) {
    invalidFields.push("siteHost");
  }

  if (!slug.success || !locale.success || !market.success || !siteHost.ok) {
    return validationError(
      "Revalidation request must include valid slug, locale, market, and siteHost when provided.",
      {
        defaults,
        fields: invalidFields,
        reason: "invalid-fields",
      },
    );
  }

  const input: RevalidateInput = {
    locale: locale.data,
    market: market.data,
    slug: slug.data,
  };

  if (siteHost.value) {
    input.siteHost = siteHost.value;
  }

  return {
    input,
    ok: true,
    paths: getPublishedPageRevalidationPaths(input),
    tags: getStorefrontRevalidationCacheTags({
      ...input,
      fallbackLocale: defaults.fallbackLocale,
    }),
  };
}

export function readRevalidateDefaults(
  env: Record<string, string | undefined> = process.env,
): RevalidateDefaults {
  const defaults = readWebRuntimeDefaults(env);

  return {
    fallbackLocale: defaults.fallbackLocale,
    locale: defaults.defaultLocale,
    market: defaults.defaultMarket,
  };
}

function readRevalidateSiteHost(value: unknown): RevalidateSiteHostResult {
  if (value === undefined) {
    return { ok: true, value: null };
  }

  if (typeof value !== "string") {
    return { ok: false };
  }

  const host = readSiteDomainHeader(value);

  return host ? { ok: true, value: host } : { ok: false };
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
