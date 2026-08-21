import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes } from "@app-starter/schema";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { runIdempotent } from "../pages.idempotency.js";
import {
  createInitialPageSchema,
  resolvePageType,
  toPageSummary,
} from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { parseCreateInput, toJson } from "../pages.validation.js";

export async function createPage(
  prisma: PrismaService,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const input = parseCreateInput(body);
  const schema = createInitialPageSchema(input);
  const type = input.type ?? resolvePageType(input.slug, input.templateId);

  return runIdempotent(prisma, {
    body: input,
    key: idempotencyKey,
    scope: "pages:create",
    site,
    operation: async () => {
      try {
        const page = await prisma.page.create({
          data: {
            siteId: site.id,
            slug: input.slug,
            title: schema.meta.title,
            type,
            status: "draft",
            versions: {
              create: {
                version: 1,
                schema: toJson(schema),
                status: "draft",
                authorId: actor.id,
              },
            },
          },
        });

        return {
          data: toPageSummary(page, site),
          meta: {
            requestId,
            tenantId: site.tenantId,
            siteId: site.id,
          },
        };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new ConflictException({
            code: apiErrorCodes.CONFLICT,
            message: "A page with this slug already exists.",
          });
        }

        throw error;
      }
    },
  });
}
