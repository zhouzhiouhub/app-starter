import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";

@Controller()
@UseGuards(AdminApiGuard)
export class LocalizationController {
  @Get("markets")
  @RequireScopes("market:read")
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
  @RequireScopes("locale:read")
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
  @RequireScopes("translation:read")
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
  @RequireScopes("locale:write")
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
