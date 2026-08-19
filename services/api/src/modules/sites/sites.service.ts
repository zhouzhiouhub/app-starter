import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes } from "@app-starter/schema";
import type { Actor } from "../identity/identity.types.js";
import { DEFAULT_SITE_DOMAIN } from "../pages/pages.constants.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toSiteSettingsResponse } from "./sites.mapper.js";
import { parseUpdateSiteSettingsInput } from "./sites.validation.js";

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(actor: Actor) {
    const site = await this.findCurrentSite(actor.tenantId);

    return {
      data: toSiteSettingsResponse(site),
      meta: {
        requestId: "local-dev",
        tenantId: actor.tenantId,
        siteId: site.id,
      },
    };
  }

  async updateCurrent(body: unknown, actor: Actor) {
    const input = parseUpdateSiteSettingsInput(body);
    const site = await this.findCurrentSite(actor.tenantId);

    try {
      const updated = await this.prisma.site.update({
        where: { id: site.id },
        data: input,
      });

      return {
        data: toSiteSettingsResponse(updated),
        meta: {
          requestId: "local-dev",
          tenantId: actor.tenantId,
          siteId: updated.id,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException({
          code: apiErrorCodes.CONFLICT,
          message: "A site with this domain already exists.",
        });
      }

      throw error;
    }
  }

  private async findCurrentSite(tenantId: string) {
    const defaultSite = await this.prisma.site.findFirst({
      where: { domain: DEFAULT_SITE_DOMAIN, tenantId },
    });

    if (defaultSite) {
      return defaultSite;
    }

    const fallback = await this.prisma.site.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });

    if (!fallback) {
      throw new NotFoundException({
        code: apiErrorCodes.NOT_FOUND,
        message: "Default site was not found.",
      });
    }

    return fallback;
  }
}
