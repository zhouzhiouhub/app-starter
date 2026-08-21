import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  apiErrorCodes,
  readSiteDomainHeader,
  storefrontHostHeaderName,
} from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import type { Actor } from "../identity/identity.types.js";
import { PagesService } from "../pages/pages.service.js";
import {
  readPublicRuntimeConfig,
  resolvePublicLocale,
  resolvePublicMarket,
} from "./public.runtime-config.js";

type PublicRequestHeaders = Record<
  string,
  readonly string[] | string | undefined
>;

@Controller("public")
export class PublicController {
  constructor(private readonly pages: PagesService) {}

  @Get("config")
  getConfig(@CurrentRequestId() requestId = "local-dev") {
    const config = readPublicRuntimeConfig();

    return {
      data: config,
      meta: {
        requestId,
        market: config.defaultMarket,
        locale: config.defaultLocale,
      },
    };
  }

  @Get("translations/:locale")
  getTranslations(
    @Param("locale") locale: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    const localeContext = resolvePublicLocale(locale);

    return {
      data: {
        locale: localeContext.locale,
        messages: {},
      },
      meta: {
        requestId,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }

  @Get("preview/:token")
  @Header("Cache-Control", "no-store")
  getPreview(
    @Param("token") token: string,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.pages.getPreviewByToken(token, requestId);
  }

  @Get("pages")
  async listPages(
    @Query("locale") locale?: string,
    @Query("market") market?: string,
    @Headers() headers?: PublicRequestHeaders,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    const localeContext = resolvePublicLocale(locale);
    const marketContext = resolvePublicMarket(market);
    const pages = await this.pages.listPublished(
      {
        locale: localeContext.locale,
        market: marketContext.market,
        siteHost: readPublicSiteHost(headers),
      },
      requestId,
    );

    return {
      data: pages.data,
      meta: {
        ...pages.meta,
        requestId,
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
    @Headers() headers?: PublicRequestHeaders,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    const localeContext = resolvePublicLocale(locale);
    const marketContext = resolvePublicMarket(market);
    const page = await this.pages.getPublishedBySlug(slug, {
      locale: localeContext.locale,
      market: marketContext.market,
      siteHost: readPublicSiteHost(headers),
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
        requestId,
        market: marketContext.market,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback || marketContext.isFallback,
      },
    };
  }
}

function readPublicSiteHost(headers: PublicRequestHeaders | undefined) {
  return (
    readHeaderDomain(headers, storefrontHostHeaderName) ??
    readHeaderDomain(headers, "x-forwarded-host") ??
    readHeaderDomain(headers, "host")
  );
}

function readHeaderDomain(
  headers: PublicRequestHeaders | undefined,
  name: string,
) {
  return readSiteDomainHeader(
    headers?.[name] ??
      headers?.[name.toLowerCase()] ??
      headers?.[toHeaderCase(name)],
  );
}

function toHeaderCase(name: string) {
  return name
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("-");
}

@Controller("admin/pages")
@UseGuards(AdminApiGuard)
export class AdminPagesController {
  constructor(private readonly pages: PagesService) {}

  @Post(":slug/publish")
  @RequireScopes("page:publish")
  publishPage(
    @CurrentUser() actor: Actor,
    @CurrentRequestId() requestId: string,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("slug") slug: string,
  ) {
    return this.pages.publishBySlug(
      slug,
      body,
      requireIdempotencyKey(idempotencyKey),
      actor,
      requestId,
    );
  }
}
