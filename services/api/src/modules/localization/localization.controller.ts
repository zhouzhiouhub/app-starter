import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  apiErrorCodes,
  defaultRuntimeConfig,
  localeCodeSchema,
} from "@app-starter/schema";
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
  getTranslations(@Query("locale") locale?: string) {
    const localeContext = resolveTranslationLocale(locale);

    return {
      data: [],
      meta: {
        requestId: "local-dev",
        locale: localeContext.locale,
        fallbackLocale: localeContext.defaultLocale,
        isFallback: localeContext.isFallback
      }
    };
  }

  @Post("locales")
  @RequireScopes("locale:write")
  createLocale(@Body() body: { code?: string }) {
    if (process.env.MULTI_LOCALE_ENABLED !== "true") {
      throw new ConflictException({
        code: apiErrorCodes.MULTI_LOCALE_DISABLED,
        message: `Cannot create locale ${body.code ?? ""} while multi-locale is disabled.`,
      });
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

function resolveTranslationLocale(locale: string | undefined): {
  defaultLocale: string;
  isFallback: boolean;
  locale: string;
} {
  const defaultLocale =
    process.env.DEFAULT_LOCALE ?? defaultRuntimeConfig.defaultLocale;
  const requestedLocale = locale ?? defaultLocale;
  const parsed = localeCodeSchema.safeParse(requestedLocale);

  if (!parsed.success) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Locale must look like en-US."
    });
  }

  const isFallback =
    process.env.MULTI_LOCALE_ENABLED !== "true" &&
    parsed.data !== defaultLocale;

  return {
    defaultLocale,
    isFallback,
    locale: isFallback ? defaultLocale : parsed.data
  };
}
