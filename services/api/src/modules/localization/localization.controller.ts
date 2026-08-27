import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { isMultiLocaleEnabled } from "../../common/feature-flags.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { readApiRuntimeDefaults } from "../../common/runtime-defaults.js";
import type { Actor } from "../identity/identity.types.js";
import {
  throwLocaleMutationDisabled,
  throwLocaleMutationReserved,
} from "./localization-locale-placeholder.js";
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
    @Query("namespace") namespace?: string,
    @Query("q") query?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.listTranslations(
      actor,
      { limit, locale, namespace, page, q: query },
      requestId,
    );
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

  @Patch("translations/:id")
  @RequireScopes("translation:write")
  updateTranslation(
    @CurrentUser() actor: Actor,
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.updateTranslation(
      id,
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
      requestId,
    );
  }

  @Post("translations/import/preview")
  @RequireScopes("translation:write")
  previewTranslationImport(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.previewTranslationImport(body, actor, requestId);
  }

  @Post("translations/export/preview")
  @RequireScopes("translation:read")
  previewTranslationExport(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.previewTranslationExport(body, actor, requestId);
  }

  @Post("translations/import")
  @RequireScopes("translation:write")
  createTranslationImport(@CurrentRequestId() requestId = "local-dev") {
    return this.localization.rejectTranslationBulkOperation(
      "import",
      requestId,
    );
  }

  @Post("translations/export")
  @RequireScopes("translation:read")
  createTranslationExport(
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.localization.exportTranslations(body, actor, requestId);
  }

  @Post("locales")
  @RequireScopes("locale:write")
  createLocale(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    if (!isMultiLocaleEnabled()) {
      return throwLocaleMutationDisabled("create", requestId);
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

  @Patch("locales/:id")
  @RequireScopes("locale:write")
  updateLocale(
    @Headers("idempotency-key") idempotencyKey?: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    if (!isMultiLocaleEnabled()) {
      return throwLocaleMutationDisabled("update", requestId);
    }

    requireIdempotencyKey(idempotencyKey);

    return throwLocaleMutationReserved("update", requestId);
  }
}
