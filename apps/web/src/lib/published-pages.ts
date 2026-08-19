import {
  defaultRuntimeConfig,
  publishedPageRevalidateSeconds,
  publishedPagesCacheTag,
} from "@app-starter/schema";

const apiBaseUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000/api/v1";

export type PublishedPageSummary = {
  publishedAt: string | null;
  slug: string;
  title: string;
  updatedAt: string;
};

export async function listPublishedPages(input?: {
  locale?: string;
  market?: string;
}): Promise<PublishedPageSummary[]> {
  try {
    const searchParams = new URLSearchParams({
      locale: input?.locale ?? defaultRuntimeConfig.defaultLocale,
      market: input?.market ?? defaultRuntimeConfig.defaultMarket,
    });
    const response = await fetch(
      `${apiBaseUrl}/public/pages?${searchParams}`,
      {
        next: {
          revalidate: publishedPageRevalidateSeconds,
          tags: [publishedPagesCacheTag],
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const result = (await response.json()) as { data?: unknown };

    if (!Array.isArray(result.data)) {
      return [];
    }

    return result.data.flatMap(readPublishedPageSummary);
  } catch {
    return [];
  }
}

function readPublishedPageSummary(value: unknown): PublishedPageSummary[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.slug !== "string" ||
    typeof record.title !== "string" ||
    typeof record.updatedAt !== "string"
  ) {
    return [];
  }

  return [
    {
      publishedAt:
        typeof record.publishedAt === "string" ? record.publishedAt : null,
      slug: record.slug,
      title: record.title,
      updatedAt: record.updatedAt,
    },
  ];
}
