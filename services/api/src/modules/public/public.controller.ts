import { Controller, Get, Param } from "@nestjs/common";
import { defaultRuntimeConfig, exampleLandingPage } from "@app-starter/schema";

@Controller("public")
export class PublicController {
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
    return {
      data: {
        ...exampleLandingPage,
        meta: {
          ...exampleLandingPage.meta,
          slug
        }
      },
      meta: {
        requestId: "local-dev",
        market: "us",
        locale: "en-US"
      }
    };
  }
}
