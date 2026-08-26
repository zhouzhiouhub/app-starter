import {
  getPublishedPageRevalidationPaths,
  getStorefrontRevalidationCacheTags,
  readSiteDomainHeader,
  type PageSchema,
  type StorefrontRevalidationResult,
} from "@app-starter/schema";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";
import {
  readStorefrontRevalidationTimeoutMs,
  resolveStorefrontRevalidateUrl,
} from "./pages.revalidation-config.js";
import {
  createStorefrontRevalidationHeaders,
  createStorefrontRevalidationPayload,
} from "./pages.revalidation-request.js";
import {
  cancelStorefrontRevalidationResponseBody,
  type StorefrontRevalidationResponse,
} from "./pages.revalidation-response.js";

export type { StorefrontRevalidationResult };
export {
  isProductionRevalidationEnvironment,
  readStorefrontRevalidationTimeoutMs,
  resolveStorefrontRevalidateUrl,
} from "./pages.revalidation-config.js";

export type StorefrontRevalidationInput = {
  fallbackLocale?: string;
  fallbackMarket?: string;
  locale: string;
  market: string;
  requestId?: string;
  siteHost?: string | null;
  slug: string;
};

type NormalizedStorefrontRevalidationInput =
  | {
      input: StorefrontRevalidationInput;
      ok: true;
    }
  | {
      ok: false;
    };

export type StorefrontRevalidator = (
  input: StorefrontRevalidationInput,
) => Promise<StorefrontRevalidationResult>;

export type RevalidatablePageResponse = {
  data: PageSchema;
  meta: {
    requestId: string;
    revalidation?: StorefrontRevalidationResult;
    [key: string]: unknown;
  };
};

type Fetcher = (
  input: string | URL,
  init?: RequestInit,
) => Promise<StorefrontRevalidationResponse>;

const maxStorefrontRevalidationSecretLength = 1024;
const storefrontRevalidationRedirectPolicy: RequestRedirect = "manual";

export async function triggerStorefrontRevalidation(
  input: StorefrontRevalidationInput,
  fetcher: Fetcher = fetch,
): Promise<StorefrontRevalidationResult> {
  const paths = getPublishedPageRevalidationPaths(input);
  const normalized = normalizeStorefrontRevalidationInput(input);

  if (!normalized.ok) {
    return {
      paths,
      reason: "invalid-site-host",
      tags: [],
      triggered: false,
    };
  }

  const normalizedInput = normalized.input;
  const tags = readStorefrontRevalidationTags(normalizedInput);
  const secret = readStorefrontRevalidationSecret();

  if (!secret) {
    return { paths, reason: "missing-secret", tags, triggered: false };
  }

  const url = resolveStorefrontRevalidateUrl();

  if (!url) {
    return { paths, reason: "missing-url", tags, triggered: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    readStorefrontRevalidationTimeoutMs(),
  );

  try {
    const response = await fetcher(url, {
      body: JSON.stringify(createStorefrontRevalidationPayload(normalizedInput)),
      headers: createStorefrontRevalidationHeaders(
        secret,
        normalizedInput.requestId,
      ),
      method: "POST",
      redirect: storefrontRevalidationRedirectPolicy,
      signal: controller.signal,
    });

    await cancelStorefrontRevalidationResponseBody(response);

    if (!response.ok) {
      return {
        paths,
        reason: "request-failed",
        status: response.status,
        tags,
        triggered: false,
      };
    }

    return { paths, tags, triggered: true };
  } catch (error) {
    const reason =
      controller.signal.aborted || isAbortError(error)
        ? "request-timeout"
        : "request-failed";

    return { paths, reason, tags, triggered: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runStorefrontRevalidationSafely(
  input: StorefrontRevalidationInput,
  revalidator: StorefrontRevalidator = triggerStorefrontRevalidation,
): Promise<StorefrontRevalidationResult> {
  try {
    return await revalidator(input);
  } catch {
    return {
      paths: getPublishedPageRevalidationPaths(input),
      reason: "request-failed",
      tags: readStorefrontRevalidationTags(input),
      triggered: false,
    };
  }
}

export async function refreshStorefrontRevalidationResponse<
  TResponse extends RevalidatablePageResponse,
>(
  response: TResponse,
  input: {
    requestId: string;
    revalidator?: StorefrontRevalidator;
    siteHost?: string | null;
  },
): Promise<TResponse> {
  const schema = response.data;

  return {
    ...response,
    meta: {
      ...response.meta,
      requestId: input.requestId,
      revalidation: await runStorefrontRevalidationSafely(
        createStorefrontRevalidationInput(
          schema,
          input.siteHost,
          input.requestId,
        ),
        input.revalidator,
      ),
    },
  } as TResponse;
}

export function createStorefrontRevalidationInput(
  schema: PageSchema,
  siteHost?: string | null,
  requestId?: string,
): StorefrontRevalidationInput {
  const defaults = readApiRuntimeDefaults();
  const input: StorefrontRevalidationInput = {
    fallbackLocale: defaults.fallbackLocale,
    fallbackMarket: defaults.market,
    locale: schema.meta.locale,
    market: schema.meta.market,
    slug: schema.meta.slug,
  };

  if (requestId) {
    input.requestId = requestId;
  }

  if (siteHost) {
    input.siteHost = readSiteDomainHeader(siteHost) ?? siteHost;
  }

  return input;
}

function normalizeStorefrontRevalidationInput(
  input: StorefrontRevalidationInput,
): NormalizedStorefrontRevalidationInput {
  const siteHost = readStorefrontRevalidationSiteHost(input.siteHost);

  if (!siteHost.ok) {
    return { ok: false };
  }

  if (!siteHost.value) {
    return { input: { ...input, siteHost: undefined }, ok: true };
  }

  return {
    input: {
      ...input,
      siteHost: siteHost.value,
    },
    ok: true,
  };
}

function readStorefrontRevalidationSiteHost(
  siteHost: string | null | undefined,
):
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
    } {
  if (siteHost === null || siteHost === undefined || siteHost.trim() === "") {
    return { ok: true, value: null };
  }

  const normalized = readSiteDomainHeader(siteHost);
  return normalized ? { ok: true, value: normalized } : { ok: false };
}

function readStorefrontRevalidationTags(
  input: StorefrontRevalidationInput,
): string[] {
  return getStorefrontRevalidationCacheTags({
    fallbackLocale: input.fallbackLocale,
    fallbackMarket: input.fallbackMarket,
    locale: input.locale,
    market: input.market,
    siteHost: input.siteHost,
    slug: input.slug,
  });
}

function readStorefrontRevalidationSecret(): string | null {
  const raw = process.env.STOREFRONT_REVALIDATE_SECRET;

  if (!raw || raw.trim().length === 0 || hasControlCharacter(raw)) {
    return null;
  }

  if (
    raw.length > maxStorefrontRevalidationSecretLength ||
    raw.trim() !== raw
  ) {
    return null;
  }

  return raw;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
