import { Body, Controller, Get, Post } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

@Controller()
export class LocalizationController {
  @Get("markets")
  getMarkets() {
    return {
      data: [
        {
          code: process.env.DEFAULT_MARKET ?? "us",
          defaultLocale: process.env.DEFAULT_LOCALE ?? "en-US",
          currency: process.env.DEFAULT_CURRENCY ?? "USD",
          status: "active"
        }
      ],
      meta: { requestId: "local-dev" }
    };
  }

  @Get("locales")
  getLocales() {
    return {
      data: [
        {
          code: process.env.DEFAULT_LOCALE ?? "en-US",
          fallbackLocale: process.env.FALLBACK_LOCALE ?? "en-US",
          status: "active"
        }
      ],
      meta: { requestId: "local-dev" }
    };
  }

  @Get("translations")
  getTranslations() {
    return {
      data: [],
      meta: {
        requestId: "local-dev",
        locale: process.env.DEFAULT_LOCALE ?? "en-US"
      }
    };
  }

  @Post("locales")
  createLocale(@Body() body: { code?: string }) {
    if (process.env.MULTI_LOCALE_ENABLED !== "true") {
      return {
        error: {
          code: apiErrorCodes.MULTI_LOCALE_DISABLED,
          message: `Cannot create locale ${body.code ?? ""} while multi-locale is disabled.`,
          requestId: "local-dev"
        }
      };
    }

    return {
      data: {
        code: body.code,
        status: "draft"
      },
      meta: { requestId: "local-dev" }
    };
  }
}
