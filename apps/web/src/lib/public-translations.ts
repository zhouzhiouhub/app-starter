import { publishedPageRevalidateSeconds } from "@app-starter/schema";
import {
  readWebRuntimeDefaults,
  resolveWebLocale,
} from "./runtime-defaults.ts";
import { getApiBaseUrl } from "./runtime-url.ts";
import {
  addStorefrontHostCacheParam,
  createStorefrontHostHeaders,
} from "./storefront-host-header.ts";

const apiBaseUrl = getApiBaseUrl();
const maxPublicTranslationKeyLength = 256;
const forbiddenPublicTranslationMessageKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export async function getPublicTranslationMessages(input: {
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
      {
        headers: createStorefrontHostHeaders(input.storefrontHost),
        next: {
          revalidate: publishedPageRevalidateSeconds,
        },
        redirect: "manual",
      },
    );

    if (!response.ok) {
      return {};
    }

    return readPublicTranslationMessages(await response.json());
  } catch {
    return {};
  }
}

function readPublicTranslationMessages(value: unknown): Record<string, string> {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.data.messages)) {
    return {};
  }

  const messages: Record<string, string> = {};

  for (const [key, message] of Object.entries(value.data.messages)) {
    if (isSafePublicTranslationKey(key) && typeof message === "string") {
      messages[key] = message;
    }
  }

  return messages;
}

function isSafePublicTranslationKey(key: string) {
  return (
    key.trim() === key &&
    key.length > 0 &&
    key.length <= maxPublicTranslationKeyLength &&
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
