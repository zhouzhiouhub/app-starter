import {
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  storefrontRevalidateSecretHeader,
  type StorefrontRevalidationResult,
} from "@app-starter/schema";

const defaultTimeoutMs = 5000;

export type { StorefrontRevalidationResult };

export type StorefrontRevalidationInput = {
  locale: string;
  market: string;
  slug: string;
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
    readRevalidationTimeoutMs(),
  );

  try {
    const response = await fetcher(url, {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        [storefrontRevalidateSecretHeader]: secret,
      },
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

export function resolveStorefrontRevalidateUrl(
  env: {
    STOREFRONT_REVALIDATE_URL?: string;
    WEB_URL?: string;
  } = process.env,
): string | null {
  const rawConfigured = env.STOREFRONT_REVALIDATE_URL?.trim();
  const configured = readSafeHttpUrl(env.STOREFRONT_REVALIDATE_URL);

  if (configured) {
    return `${configured.origin}${trimTrailingSlashes(configured.pathname)}`;
  }

  if (rawConfigured) {
    return null;
  }

  const webUrl = readSafeHttpUrl(env.WEB_URL);

  if (!webUrl) {
    return null;
  }

  return `${webUrl.origin}/api/revalidate`;
}

function readSafeHttpUrl(value: string | undefined): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !isHttpProtocol(url.protocol) ||
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

function readRevalidationTimeoutMs(): number {
  const parsed = Number(process.env.STOREFRONT_REVALIDATE_TIMEOUT_MS);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return defaultTimeoutMs;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
