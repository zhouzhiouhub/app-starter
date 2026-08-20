import {
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { isMultiLocaleEnabled } from "../../common/feature-flags.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";
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
    const defaults = readApiRuntimeDefaults();

    return {
      data: [
        {
          code: defaults.market,
          defaultLocale: defaults.locale,
          currency: defaults.currency,
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
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }

  @Post("locales")
  @RequireScopes("locale:write")
  createLocale(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    if (!isMultiLocaleEnabled()) {
      throw new ConflictException({
        code: apiErrorCodes.MULTI_LOCALE_DISABLED,
        message: "Cannot create locales while multi-locale is disabled.",
      });
    }

    requireIdempotencyKey(idempotencyKey);
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
