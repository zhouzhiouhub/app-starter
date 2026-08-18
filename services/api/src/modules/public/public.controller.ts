import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  apiErrorCodes,
  defaultRuntimeConfig,
  localeCodeSchema,
  marketCodeSchema,
} from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
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
        defaultMarket:
          process.env.DEFAULT_MARKET ?? defaultRuntimeConfig.defaultMarket,
        defaultLocale:
          process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale,
        defaultCurrency:
          process.env.DEFAULT_CURRENCY ?? defaultRuntimeConfig.defaultCurrency,
        fallbackLocale:
          process.env.FALLBACK_LOCALE ?? defaultRuntimeConfig.fallbackLocale,
      },
      meta: {
        requestId: "local-dev",
        market: process.env.DEFAULT_MARKET ?? "us",
        locale: process.env.DEFAULT_LOCALE ?? "en-US",
      },
    };
  }

  @Get("translations/:locale")
  getTranslations(@Param("locale") locale: string) {
    const localeContext = resolvePublicLocale(locale);

    return {
      data: {
        locale: localeContext.locale,
        messages: {},
      },
      meta: {
        requestId: "local-dev",
        locale: localeContext.locale,
        fallbackLocale: localeContext.defaultLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }

  @Get("pages/:slug")
  async getPage(
    @Param("slug") slug: string,
    @Query("locale") locale?: string,
    @Query("market") market?: string,
  ) {
    const localeContext = resolvePublicLocale(locale);
    const marketContext = resolvePublicMarket(market);
    const page = await this.pages.getPublishedBySlug(slug);

    if (!page) {
      throw new NotFoundException({
        code: apiErrorCodes.NOT_FOUND,
        message: "Published page not found.",
      });
    }

    return {
      data: page,
      meta: {
        requestId: "local-dev",
        market: marketContext.market,
        locale: localeContext.locale,
        fallbackLocale: localeContext.defaultLocale,
        isFallback: localeContext.isFallback || marketContext.isFallback,
      },
    };
  }
}

@Controller("admin/pages")
@UseGuards(AdminApiGuard)
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Post(":slug/publish")
  @RequireScopes("page:publish")
  publishPage(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("slug") slug: string,
  ) {
    return this.pages.publishBySlug(
      slug,
      body,
      requireIdempotencyKey(idempotencyKey),
    );
  }
}

function resolvePublicLocale(locale: string | undefined): {
  defaultLocale: string;
  isFallback: boolean;
  locale: string;
} {
  const defaultLocale =
    process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale;
  const requestedLocale = locale ?? defaultLocale;
  const parsed = localeCodeSchema.safeParse(requestedLocale);

  if (!parsed.success) {
    throwValidationError("Locale must look like en-US.");
  }

  const isFallback =
    process.env.MULTI_LOCALE_ENABLED !== "true" &&
    parsed.data !== defaultLocale;

  return {
    defaultLocale,
    isFallback,
    locale: isFallback ? defaultLocale : parsed.data,
  };
}

function resolvePublicMarket(market: string | undefined): {
  isFallback: boolean;
  market: string;
} {
  const defaultMarket =
    process.env.DEFAULT_MARKET ?? defaultRuntimeConfig.defaultMarket;
  const requestedMarket = market ?? defaultMarket;
  const parsed = marketCodeSchema.safeParse(requestedMarket);

  if (!parsed.success) {
    throwValidationError("Market code must be lowercase.");
  }

  const isFallback = parsed.data !== defaultMarket;

  return {
    isFallback,
    market: isFallback ? defaultMarket : parsed.data,
  };
}

function throwValidationError(message: string): never {
  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message,
  });
}
