import {
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
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import type { Actor } from "../identity/identity.types.js";
import { PagesService } from "../pages/pages.service.js";
import {
  readPublicRuntimeConfig,
  resolvePublicLocale,
  resolvePublicMarket,
} from "./public.runtime-config.js";

@Controller("public")
export class PublicController {
  constructor(private readonly pages: PagesService) {}

  @Get("config")
  getConfig() {
    const config = readPublicRuntimeConfig();

    return {
      data: config,
      meta: {
        requestId: "local-dev",
        market: config.defaultMarket,
        locale: config.defaultLocale,
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
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }

  @Get("preview/:token")
  getPreview(@Param("token") token: string) {
    return this.pages.getPreviewByToken(token);
  }

  @Get("pages")
  async listPages(
    @Query("locale") locale?: string,
    @Query("market") market?: string,
  ) {
    const localeContext = resolvePublicLocale(locale);
    const marketContext = resolvePublicMarket(market);
    const pages = await this.pages.listPublished({
      locale: localeContext.locale,
      market: marketContext.market,
    });

    return {
      data: pages.data,
      meta: {
        ...pages.meta,
        market: marketContext.market,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback || marketContext.isFallback,
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
    const page = await this.pages.getPublishedBySlug(slug, {
      locale: localeContext.locale,
      market: marketContext.market,
    });

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
        fallbackLocale: localeContext.fallbackLocale,
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
    @CurrentUser() actor: Actor,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("slug") slug: string,
  ) {
    return this.pages.publishBySlug(
      slug,
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
    );
  }
}
