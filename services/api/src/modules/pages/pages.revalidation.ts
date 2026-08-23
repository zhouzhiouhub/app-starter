import {
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  isUnsafeProductionHostname,
  type PageSchema,
  type StorefrontRevalidationResult,
} from "@app-starter/schema";
import {
  createStorefrontRevalidationHeaders,
  createStorefrontRevalidationPayload,
} from "./pages.revalidation-request.js";

const defaultTimeoutMs = 5000;
const maxTimeoutMs = 30000;

export type { StorefrontRevalidationResult };

export type StorefrontRevalidationInput = {
  locale: string;
  market: string;
  requestId?: string;
  siteHost?: string | null;
  slug: string;
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
) => Promise<{ ok: boolean; status: number }>;

export async function triggerStorefrontRevalidation(
  input: StorefrontRevalidationInput,
  fetcher: Fetcher = fetch,
): Promise<StorefrontRevalidationResult> {
  const paths = getPublishedPageRevalidationPaths(input);
  const tags = getPublishedPageCacheTags(input);
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET?.trim();

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
      body: JSON.stringify(createStorefrontRevalidationPayload(input)),
      headers: createStorefrontRevalidationHeaders(secret, input.requestId),
      method: "POST",
      signal: controller.signal,
    });

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
      tags: getPublishedPageCacheTags(input),
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
  const input: StorefrontRevalidationInput = {
    locale: schema.meta.locale,
    market: schema.meta.market,
    slug: schema.meta.slug,
  };

  if (requestId) {
    input.requestId = requestId;
  }

  if (siteHost) {
    input.siteHost = siteHost;
  }

  return input;
}

export function resolveStorefrontRevalidateUrl(
  env: {
    APP_ENV?: string;
    NODE_ENV?: string;
    STOREFRONT_REVALIDATE_URL?: string;
    VERCEL_ENV?: string;
    WEB_URL?: string;
  } = process.env,
): string | null {
  const rawConfigured = env.STOREFRONT_REVALIDATE_URL?.trim();
  const requireProductionUrl = isProductionRevalidationEnvironment(env);
  const configured = readSafeHttpUrl(
    env.STOREFRONT_REVALIDATE_URL,
    requireProductionUrl,
  );

  if (configured) {
    return createRevalidateEndpointUrl(configured);
  }

  if (rawConfigured) {
    return null;
  }

  const webUrl = readSafeHttpUrl(env.WEB_URL, requireProductionUrl);

  if (!webUrl) {
    return null;
  }

  return `${webUrl.origin}/api/revalidate`;
}

function createRevalidateEndpointUrl(url: URL): string {
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname === "/") {
    return `${url.origin}/api/revalidate`;
  }

  return `${url.origin}${pathname}`;
}

function readSafeHttpUrl(
  value: string | undefined,
  requireProductionUrl: boolean,
): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !isHttpProtocol(url.protocol) ||
      (requireProductionUrl && url.protocol !== "https:") ||
      (requireProductionUrl && isUnsafeProductionHostname(url.hostname)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function trimTrailingSlashes(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed || "/";
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

export function readStorefrontRevalidationTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const value = env.STOREFRONT_REVALIDATE_TIMEOUT_MS?.trim();

  if (!value || !/^\d+$/.test(value)) {
    return defaultTimeoutMs;
  }

  const parsed = Number(value);

  if (Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maxTimeoutMs) {
    return parsed;
  }

  return defaultTimeoutMs;
}

export function isProductionRevalidationEnvironment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
