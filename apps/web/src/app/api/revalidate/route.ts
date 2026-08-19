import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import {
  defaultRuntimeConfig,
  getPublishedPageCacheTags,
  getPublishedPageRevalidationPaths,
  localeCodeSchema,
  marketCodeSchema,
  pageSlugSchema,
  storefrontRevalidateSecretHeader,
} from "@app-starter/schema";

export const dynamic = "force-dynamic";

type RevalidateInput = {
  locale: string;
  market: string;
  slug: string;
};

export async function POST(request: NextRequest) {
  const configuredSecret =
    process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ?? "";

  if (!configuredSecret) {
    return errorResponse(
      "REVALIDATE_NOT_CONFIGURED",
      "Storefront revalidation is not configured.",
      503,
    );
  }

  if (request.headers.get(storefrontRevalidateSecretHeader) !== configuredSecret) {
    return errorResponse("UNAUTHORIZED", "Invalid revalidation secret.", 401);
  }

  const input = parseInput(await readJson(request));

  if (!input) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Revalidation request must include valid slug, locale, and market.",
      400,
    );
  }

  const tags = getPublishedPageCacheTags(input);
  const paths = getPublishedPageRevalidationPaths(input);

  for (const tag of tags) {
    revalidateTag(tag);
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    data: {
      paths,
      tags,
      revalidated: true,
    },
    meta: {
      requestId: "local-dev",
      locale: input.locale,
      market: input.market,
    },
  });
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseInput(body: unknown): RevalidateInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const slug = pageSlugSchema.safeParse(payload.slug);
  const locale = localeCodeSchema.safeParse(
    payload.locale ?? process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale,
  );
  const market = marketCodeSchema.safeParse(
    payload.market ?? process.env.DEFAULT_MARKET ?? defaultRuntimeConfig.defaultMarket,
  );

  if (!slug.success || !locale.success || !market.success) {
    return null;
  }

  return {
    locale: locale.data,
    market: market.data,
    slug: slug.data,
  };
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}
