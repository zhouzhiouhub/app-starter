import {
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import {
  apiErrorCodes,
  readSiteDomainHeader,
  storefrontHostHeaderName,
} from "@app-starter/schema";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
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
    @Headers() headers?: PublicRequestHeaders,
  ) {
    return this.pages.getPreviewByToken(token, requestId, {
      siteHost: readPublicSiteHost(headers),
    });
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
        requestId,
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
  for (const name of [
    storefrontHostHeaderName,
    "x-forwarded-host",
    "host",
  ]) {
    const header = readSiteHostHeader(headers, name);

    if (header.found) {
      return readSiteDomainHeader(header.value) ?? header.value;
    }
  }

  return null;
}

type SiteHostHeaderResult =
  | { found: false }
  | {
      found: true;
      value: string;
    };

function readSiteHostHeader(
  headers: PublicRequestHeaders | undefined,
  name: string,
): SiteHostHeaderResult {
  const value =
    headers?.[name] ??
    headers?.[name.toLowerCase()] ??
    headers?.[toHeaderCase(name)];

  if (Array.isArray(value)) {
    const rawValue = value.map((item) => item.trim()).filter(Boolean).join(",");
    return rawValue ? { found: true, value: rawValue } : { found: false };
  }

  if (typeof value !== "string") {
    return { found: false };
  }

  const rawValue = value.trim();
  return rawValue ? { found: true, value: rawValue } : { found: false };
}

function toHeaderCase(name: string) {
  return name
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("-");
}
