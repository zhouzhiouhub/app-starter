import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import {
  parseCreateLocaleInput,
  readDefaultLocale,
  readFallbackLocale,
  resolveTranslationLocale,
} from "./localization.validation.js";

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
          defaultLocale: readDefaultLocale(),
          currency: process.env.DEFAULT_CURRENCY ?? "USD",
          status: "active",
        },
      ],
      meta: { requestId: "local-dev" },
    };
  }

  @Get("locales")
  @RequireScopes("locale:read")
  getLocales() {
    return {
      data: [
        {
          code: readDefaultLocale(),
          fallbackLocale: readFallbackLocale(),
          status: "active",
        },
      ],
      meta: { requestId: "local-dev" },
    };
  }

  @Get("translations")
  @RequireScopes("translation:read")
  getTranslations(@Query("locale") locale?: string) {
    const localeContext = resolveTranslationLocale(locale);

    return {
      data: [],
      meta: {
        requestId: "local-dev",
        locale: localeContext.locale,
        fallbackLocale: localeContext.defaultLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }

  @Post("locales")
  @RequireScopes("locale:write")
  createLocale(@Body() body: unknown) {
    if (process.env.MULTI_LOCALE_ENABLED !== "true") {
      throw new ConflictException({
        code: apiErrorCodes.MULTI_LOCALE_DISABLED,
        message: "Cannot create locales while multi-locale is disabled.",
      });
    }

    const input = parseCreateLocaleInput(body);

    return {
      data: {
        code: input.code,
        status: "draft",
      },
      meta: { requestId: "local-dev" },
    };
  }
}
