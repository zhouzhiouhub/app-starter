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
import { CurrentUser } from "../../common/current-user.decorator.js";
import { isMultiLocaleEnabled } from "../../common/feature-flags.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";
import type { Actor } from "../identity/identity.types.js";
import { LocalizationService } from "./localization.service.js";
import {
  parseCreateLocaleInput,
  readDefaultLocale,
  readFallbackLocale,
} from "./localization.validation.js";

@Controller()
@UseGuards(AdminApiGuard)
export class LocalizationController {
  constructor(private readonly localization: LocalizationService) {}

  @Get("markets")
  @RequireScopes("market:read")
  getMarkets(@CurrentRequestId() requestId = "local-dev") {
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
      meta: { requestId },
    };
  }

  @Get("locales")
  @RequireScopes("locale:read")
  getLocales(@CurrentRequestId() requestId = "local-dev") {
    return {
      data: [
        {
          code: readDefaultLocale(),
          fallbackLocale: readFallbackLocale(),
          status: "active",
        },
      ],
      meta: { requestId },
    };
  }

  @Get("translations")
  @RequireScopes("translation:read")
  getTranslations(
    @CurrentUser() actor: Actor,
    @Query("locale") locale?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.listTranslations(actor, locale, requestId);
  }

  @Post("translations")
  @RequireScopes("translation:write")
  upsertTranslation(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.upsertTranslation(
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
      requestId,
    );
  }

  @Post("locales")
  @RequireScopes("locale:write")
  createLocale(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    if (!isMultiLocaleEnabled()) {
      throw new ConflictException({
        code: apiErrorCodes.MULTI_LOCALE_DISABLED,
        message: "Cannot create locales while multi-locale is disabled.",
        requestId,
      });
    }

    requireIdempotencyKey(idempotencyKey);
    const input = parseCreateLocaleInput(body);

    return {
      data: {
        code: input.code,
        status: "draft",
      },
      meta: { requestId },
    };
  }
}
