import {
  getPublishedPagesCacheTags,
  pageSlugSchema,
  publishedPageRevalidateSeconds,
  publicPublishedPageListMaxCount,
} from "@app-starter/schema";
import {
  readWebRuntimeDefaults,
  resolveWebLocale,
  resolveWebMarket,
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

export type PublishedPageSummary = {
  noIndex: boolean;
  publishedAt: string | null;
  slug: string;
  title: string;
  updatedAt: string;
};

export async function listPublishedPages(input?: {
  locale?: string;
  market?: string;
  storefrontHost?: string | null;
}): Promise<PublishedPageSummary[]> {
  try {
    const defaults = readWebRuntimeDefaults();
    const locale = resolveWebLocale(input?.locale, defaults);
    const market = resolveWebMarket(input?.market, defaults);

    if (!locale || !market) {
      return [];
    }

    const searchParams = new URLSearchParams({
      locale,
      market,
    });
    addStorefrontHostCacheParam(searchParams, input?.storefrontHost);

    const response = await fetch(`${apiBaseUrl}/public/pages?${searchParams}`, {
      headers: createStorefrontHostHeaders(input?.storefrontHost),
      next: {
        revalidate: publishedPageRevalidateSeconds,
        tags: getPublishedPagesCacheTags({
          locale,
          market,
          siteHost: input?.storefrontHost,
        }),
      },
      redirect: "manual",
    });

    if (!response.ok) {
      await cancelPublicApiResponseBody(response);
      return [];
    }

    const result = await readPublicApiJson(response);

    if (!isRecord(result) || !Array.isArray(result.data)) {
      return [];
    }

    return readPublishedPageSummaries(result.data);
  } catch {
    return [];
  }
}

function readPublishedPageSummaries(values: unknown[]): PublishedPageSummary[] {
  const summaries: PublishedPageSummary[] = [];

  for (const value of values) {
    summaries.push(...readPublishedPageSummary(value));

    if (summaries.length >= publicPublishedPageListMaxCount) {
      return summaries;
    }
  }

  return summaries;
}

function readPublishedPageSummary(value: unknown): PublishedPageSummary[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const slug = pageSlugSchema.safeParse(record.slug);
  const updatedAt = readIsoDateString(record.updatedAt);

  if (
    !slug.success ||
    typeof record.noIndex !== "boolean" ||
    typeof record.title !== "string" ||
    !updatedAt
  ) {
    return [];
  }

  return [
    {
      noIndex: record.noIndex,
      publishedAt: readIsoDateString(record.publishedAt),
      slug: slug.data,
      title: record.title,
      updatedAt,
    },
  ];
}

function readIsoDateString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
