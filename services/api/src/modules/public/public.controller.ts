import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post
} from "@nestjs/common";
import {
  defaultRuntimeConfig,
  exampleLandingPage,
  pageSchema
} from "@app-starter/schema";
import { PublishedPageStore } from "./published-page.store.js";

@Controller("public")
export class PublicController {
  constructor(private readonly pages: PublishedPageStore) {}

  @Get("config")
  getConfig() {
    return {
      data: {
        commerceEnabled: process.env.COMMERCE_ENABLED === "true",
        multiLocaleEnabled: process.env.MULTI_LOCALE_ENABLED === "true",
        defaultMarket: process.env.DEFAULT_MARKET ?? defaultRuntimeConfig.defaultMarket,
        defaultLocale: process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale,
        defaultCurrency:
          process.env.DEFAULT_CURRENCY ?? defaultRuntimeConfig.defaultCurrency,
        fallbackLocale:
          process.env.FALLBACK_LOCALE ?? defaultRuntimeConfig.fallbackLocale
      },
      meta: {
        requestId: "local-dev",
        market: process.env.DEFAULT_MARKET ?? "us",
        locale: process.env.DEFAULT_LOCALE ?? "en-US"
      }
    };
  }

  @Get("translations/:locale")
  getTranslations(@Param("locale") locale: string) {
    const defaultLocale = process.env.DEFAULT_LOCALE ?? "en-US";
    const isFallback =
      process.env.MULTI_LOCALE_ENABLED !== "true" && locale !== defaultLocale;

    return {
      data: {
        locale: isFallback ? defaultLocale : locale,
        messages: {}
      },
      meta: {
        requestId: "local-dev",
        locale: isFallback ? defaultLocale : locale,
        fallbackLocale: defaultLocale,
        isFallback
      }
    };
  }

  @Get("pages/:slug")
  getPage(@Param("slug") slug: string) {
    const page = this.pages.get(slug);

    return {
      data:
        page ??
        pageSchema.parse({
          ...exampleLandingPage,
          meta: {
            ...exampleLandingPage.meta,
            slug
          }
        }),
      meta: {
        requestId: "local-dev",
        market: "us",
        locale: "en-US"
      }
    };
  }
}

@Controller("admin/pages")
export class AdminPagesController {
  constructor(private readonly pages: PublishedPageStore) {}

  @Post(":slug/publish")
  publishPage(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("slug") slug: string
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "Idempotency-Key header is required for publish."
      });
    }

    const candidate = unwrapBodyData(body);
    const candidateMeta =
      candidate.meta && typeof candidate.meta === "object" ? candidate.meta : {};
    const parsed = pageSchema.safeParse({
      ...candidate,
      meta: {
        ...candidateMeta,
        slug
      }
    });

    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Invalid page schema.",
        details: parsed.error.flatten()
      });
    }

    const published = this.pages.publish(parsed.data);

    return {
      data: published,
      meta: {
        requestId: "local-dev",
        idempotencyKey,
        market: published.meta.market,
        locale: published.meta.locale
      }
    };
  }
}

function unwrapBodyData(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Request body must be an object."
    });
  }

  const record = body as Record<string, unknown>;
  const data = record.data ?? record;

  if (!data || typeof data !== "object") {
    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      message: "Request body data must be an object."
    });
  }

  return data as Record<string, unknown>;
}
