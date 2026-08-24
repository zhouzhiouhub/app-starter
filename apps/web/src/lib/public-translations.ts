import {
  getPublicTranslationCacheTags,
  publishedPageRevalidateSeconds,
  publicTranslationKeyMaxLength,
  publicTranslationMessageMaxLength,
} from "@app-starter/schema";
import {
  readWebRuntimeDefaults,
  resolveWebLocale,
} from "./runtime-defaults.ts";
import { getApiBaseUrl } from "./runtime-url.ts";
import {
  addStorefrontHostCacheParam,
  createStorefrontHostHeaders,
} from "./storefront-host-header.ts";
import {
  cancelPublicApiResponseBody,
  readPublicApiJson,
} from "./public-api-response.ts";

const apiBaseUrl = getApiBaseUrl();
const forbiddenPublicTranslationMessageKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export async function getPublicTranslationMessages(input: {
  cacheMode?: "no-store" | "revalidate";
  locale: string;
  storefrontHost?: string | null;
}): Promise<Record<string, string>> {
  const defaults = readWebRuntimeDefaults();
  const locale = resolveWebLocale(input.locale, defaults);

  if (!locale) {
    return {};
  }

  try {
    const searchParams = new URLSearchParams();
    addStorefrontHostCacheParam(searchParams, input.storefrontHost);
    const query = searchParams.toString();
    const response = await fetch(
      `${apiBaseUrl}/public/translations/${encodeURIComponent(locale)}${query ? `?${query}` : ""}`,
      createPublicTranslationFetchInit({
        cacheMode: input.cacheMode ?? "revalidate",
        fallbackLocale: defaults.fallbackLocale,
        locale,
        storefrontHost: input.storefrontHost,
      }),
    );

    if (!response.ok) {
      await cancelPublicApiResponseBody(response);
      return {};
    }

    return readPublicTranslationMessages(await readPublicApiJson(response), {
      fallbackLocale: defaults.fallbackLocale,
      locale,
      defaultLocale: defaults.defaultLocale,
    });
  } catch {
    return {};
  }
}

function createPublicTranslationFetchInit(input: {
  cacheMode: "no-store" | "revalidate";
  fallbackLocale: string;
  locale: string;
  storefrontHost?: string | null;
}) {
  const init = {
    headers: createStorefrontHostHeaders(input.storefrontHost),
    redirect: "manual" as const,
  };

  if (input.cacheMode === "no-store") {
    return {
      ...init,
      cache: "no-store" as const,
    };
  }

  return {
    ...init,
    next: {
      revalidate: publishedPageRevalidateSeconds,
      tags: getPublicTranslationCacheTags({
        fallbackLocale: input.fallbackLocale,
        locale: input.locale,
        siteHost: input.storefrontHost,
      }),
    },
  };
}

function readPublicTranslationMessages(
  value: unknown,
  context: {
    defaultLocale: string;
    fallbackLocale: string;
    locale: string;
  },
): Record<string, string> {
  if (
    !isRecord(value) ||
    !isRecord(value.data) ||
    !isRecord(value.data.messages) ||
    !isExpectedTranslationLocale(
      { data: value.data, meta: value.meta },
      context,
    )
  ) {
    return {};
  }

  const messages: Record<string, string> = {};

  for (const [key, message] of Object.entries(value.data.messages)) {
    if (isSafePublicTranslationEntry(key, message)) {
      messages[key] = message;
    }
  }

  return messages;
}

function isSafePublicTranslationEntry(
  key: string,
  message: unknown,
): message is string {
  return (
    isSafePublicTranslationKey(key) &&
    typeof message === "string" &&
    message.length <= publicTranslationMessageMaxLength
  );
}

function isExpectedTranslationLocale(
  value: {
    data: Record<string, unknown>;
    meta?: unknown;
  },
  context: {
    defaultLocale: string;
    fallbackLocale: string;
    locale: string;
  },
) {
  const responseLocale = value.data.locale;

  if (responseLocale === context.locale) {
    return true;
  }

  if (!isRecord(value.meta) || value.meta.isFallback !== true) {
    return false;
  }

  return (
    responseLocale === context.defaultLocale ||
    responseLocale === context.fallbackLocale
  );
}

function isSafePublicTranslationKey(key: string) {
  return (
    key.trim() === key &&
    key.length > 0 &&
    key.length <= publicTranslationKeyMaxLength &&
    !forbiddenPublicTranslationMessageKeys.has(key.toLowerCase()) &&
    !hasControlCharacter(key)
  );
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
