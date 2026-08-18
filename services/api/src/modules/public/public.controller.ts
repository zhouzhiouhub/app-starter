import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post
} from "@nestjs/common";
import { apiErrorCodes, defaultRuntimeConfig } from "@app-starter/schema";
import { PagesService } from "../pages/pages.service.js";

@Controller("public")
export class PublicController {
  constructor(private readonly pages: PagesService) {}

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
  async getPage(@Param("slug") slug: string) {
    const page = await this.pages.getPublishedBySlug(slug);

    if (!page) {
      throw new NotFoundException({
        code: apiErrorCodes.NOT_FOUND,
        message: "Published page not found."
      });
    }

    return {
      data: page,
      meta: {
        requestId: "local-dev",
        market: page.meta.market,
        locale: page.meta.locale
      }
    };
  }
}

@Controller("admin/pages")
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Post(":slug/publish")
  publishPage(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("slug") slug: string
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: "Idempotency-Key header is required for publish."
      });
    }

    return this.pages.publishBySlug(slug, body);
  }
}
