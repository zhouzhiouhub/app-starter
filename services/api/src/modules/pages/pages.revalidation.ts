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
  } catch {
    return { paths, reason: "request-failed", tags, triggered: false };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveStorefrontRevalidateUrl(): string | null {
  const configured = process.env.STOREFRONT_REVALIDATE_URL?.trim();

  if (configured) {
    return configured;
  }

  const webUrl = process.env.WEB_URL?.trim();

  if (!webUrl) {
    return null;
  }

  return `${webUrl.replace(/\/$/, "")}/api/revalidate`;
}

function readRevalidationTimeoutMs(): number {
  const parsed = Number(process.env.STOREFRONT_REVALIDATE_TIMEOUT_MS);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return defaultTimeoutMs;
}
