import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import { ZodError } from "zod";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { runIdempotent } from "./pages.idempotency.js";
import {
  createInitialPageSchema,
  createPageInputSchema,
  listPagesQuerySchema,
  nextVersionNumber,
  pageSlugSchema,
  parsePageSchema,
  resolvePageType,
  toPageSummary,
  unwrapBodyData,
  type CreatePageInput,
} from "./pages.mapper.js";
import { getPublicDefaultSite, getSiteForTenant } from "./pages.site.js";
import { persistPublishedVersion } from "./pages.versions.js";

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: { page?: string | number; limit?: string | number },
    actor: Actor,
  ) {
    const { page, limit } = this.parseOrThrow(() =>
      listPagesQuerySchema.parse(query),
    );
    const site = await getSiteForTenant(this.prisma, actor.tenantId);
    const skip = (page - 1) * limit;

    const [total, pages] = await this.prisma.$transaction([
      this.prisma.page.count({ where: { siteId: site.id } }),
      this.prisma.page.findMany({
        where: { siteId: site.id },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: pages.map(toPageSummary),
      meta: {
        requestId: "local-dev",
        tenantId: site.tenantId,
        siteId: site.id,
        total,
        page,
        limit,
      },
    };
  }

  async getById(id: string, actor: Actor) {
    const site = await getSiteForTenant(this.prisma, actor.tenantId);
    const page = await this.prisma.page.findFirst({
      where: { id, siteId: site.id },
      include: {
        versions: {
          orderBy: { version: "desc" },
        },
      },
    });

    if (!page) {
      throw this.notFound("Page not found.");
    }

    const latest = page.versions[0] ?? null;
    const published = page.publishedVersionId
      ? (page.versions.find(
          (version) => version.id === page.publishedVersionId,
        ) ?? null)
      : null;

    return {
      data: {
        ...toPageSummary(page),
        draftSchema: latest ? this.readSchema(latest.schema, page.slug) : null,
        publishedSchema: published
          ? this.readSchema(published.schema, page.slug)
          : null,
        versions: page.versions.map((version) => ({
          id: version.id,
          version: version.version,
          status: version.status,
          publishedAt: version.publishedAt?.toISOString() ?? null,
          createdAt: version.createdAt.toISOString(),
        })),
      },
      meta: {
        requestId: "local-dev",
        tenantId: site.tenantId,
        siteId: site.id,
      },
    };
  }

  async create(body: unknown, idempotencyKey: string | undefined, actor: Actor) {
    const site = await getSiteForTenant(this.prisma, actor.tenantId);
    const input = this.parseCreateInput(body);
    const schema = createInitialPageSchema(input);
    const type = input.type ?? resolvePageType(input.slug, input.templateId);

    return runIdempotent(this.prisma, {
      body: input,
      key: idempotencyKey,
      scope: "pages:create",
      site,
      operation: async () => {
        try {
          const page = await this.prisma.page.create({
            data: {
              siteId: site.id,
              slug: input.slug,
              title: schema.meta.title,
              type,
              status: "draft",
              versions: {
                create: {
                  version: 1,
                  schema: this.toJson(schema),
                  status: "draft",
                  authorId: actor.id,
                },
              },
            },
          });

          return {
            data: toPageSummary(page),
            meta: {
              requestId: "local-dev",
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

  async saveDraft(
    id: string,
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
  ) {
    const site = await getSiteForTenant(this.prisma, actor.tenantId);

    return runIdempotent(this.prisma, {
      body,
      key: idempotencyKey,
      scope: `pages:${id}:save-draft`,
      site,
      operation: async () => {
        const page = await this.prisma.$transaction(async (tx) => {
          const current = await tx.page.findFirst({
            where: { id, siteId: site.id },
            include: {
              versions: {
                orderBy: { version: "desc" },
                take: 1,
              },
            },
          });

          if (!current) {
            throw this.notFound("Page not found.");
          }

          const schema = this.parseSchema(body, current.slug);
          const latest = current.versions[0];

          if (latest && latest.status !== "published") {
            await tx.pageVersion.update({
              where: { id: latest.id },
              data: {
                schema: this.toJson(schema),
                authorId: actor.id,
              },
            });
          } else {
            await tx.pageVersion.create({
              data: {
                pageId: current.id,
                version: nextVersionNumber(latest?.version),
                schema: this.toJson(schema),
                status: "draft",
                authorId: actor.id,
              },
            });
          }

          return tx.page.update({
            where: { id: current.id },
            data: {
              title: schema.meta.title,
            },
          });
        });

        return {
          data: toPageSummary(page),
          meta: {
            requestId: "local-dev",
            tenantId: site.tenantId,
            siteId: site.id,
          },
        };
      },
    });
  }

  async publish(
    id: string,
    body: unknown | undefined,
    idempotencyKey: string | undefined,
    actor: Actor,
  ) {
    const site = await getSiteForTenant(this.prisma, actor.tenantId);
    return runIdempotent(this.prisma, {
      body: body ?? {},
      key: idempotencyKey,
      scope: `pages:${id}:publish`,
      site,
      operation: async () => {
        const schema = await this.prisma.$transaction(async (tx) => {
          const current = await tx.page.findFirst({
            where: { id, siteId: site.id },
            include: {
              versions: {
                orderBy: { version: "desc" },
                take: 1,
              },
            },
          });

          if (!current) {
            throw this.notFound("Page not found.");
          }

          const latest = current.versions[0];
          const parsed = body
            ? this.parseSchema(body, current.slug)
            : latest
              ? this.readSchema(latest.schema, current.slug)
              : null;

          if (!parsed) {
            throw this.notFound("Page has no schema to publish.");
          }

          const publishedVersion = await persistPublishedVersion(tx, {
            authorId: actor.id,
            latest,
            pageId: current.id,
            schema: parsed,
          });

          await tx.page.update({
            where: { id: current.id },
            data: {
              title: parsed.meta.title,
              status: "published",
              publishedVersionId: publishedVersion.id,
            },
          });

          return parsed;
        });

        return {
          data: schema,
          meta: {
            requestId: "local-dev",
            tenantId: site.tenantId,
            siteId: site.id,
            market: schema.meta.market,
            locale: schema.meta.locale,
          },
        };
      },
    });
  }

  async publishBySlug(
    slug: string,
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
  ) {
    const site = await getSiteForTenant(this.prisma, actor.tenantId);
    const normalizedSlug = this.parseSlug(slug);
    const schema = this.parseSchema(body, normalizedSlug);

    return runIdempotent(this.prisma, {
      body: schema,
      key: idempotencyKey,
      scope: `admin/pages:${normalizedSlug}:publish`,
      site,
      operation: async () => {
        const page = await this.prisma.page.findUnique({
          where: {
            siteId_slug: {
              siteId: site.id,
              slug: normalizedSlug,
            },
          },
        });

        if (!page) {
          const created = await this.create(
            {
              slug: normalizedSlug,
              title: schema.meta.title,
              type: resolvePageType(normalizedSlug),
            },
            undefined,
            actor,
          );
          return this.publish(created.data.id, schema, undefined, actor);
        }

        return this.publish(page.id, schema, undefined, actor);
      },
    });
  }

  async getPublishedBySlug(slug: string): Promise<PageSchema | null> {
    const site = await getPublicDefaultSite(this.prisma);
    const normalizedSlug = this.parseSlug(slug);
    const page = await this.prisma.page.findUnique({
      where: {
        siteId_slug: {
          siteId: site.id,
          slug: normalizedSlug,
        },
      },
      include: {
        versions: true,
      },
    });

    if (!page?.publishedVersionId) {
      return null;
    }

    const published = page.versions.find(
      (version) => version.id === page.publishedVersionId,
    );

    if (!published) {
      return null;
    }

    return this.readSchema(published.schema, page.slug);
  }


  private parseCreateInput(body: unknown): CreatePageInput {
    return this.parseOrThrow(() =>
      createPageInputSchema.parse(unwrapBodyData(body)),
    );
  }

  private parseSlug(slug: string): string {
    return this.parseOrThrow(() => pageSlugSchema.parse(slug));
  }

  private parseSchema(body: unknown, slug: string): PageSchema {
    return this.parseOrThrow(() => parsePageSchema(body, slug));
  }

  private parseOrThrow<T>(fn: () => T): T {
    try {
      return fn();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: apiErrorCodes.VALIDATION_ERROR,
          message: error.issues[0]?.message ?? "Invalid request.",
          details: error.flatten(),
        });
      }

      if (error instanceof Error && error.message.startsWith("Request body")) {
        throw new BadRequestException({
          code: apiErrorCodes.VALIDATION_ERROR,
          message: error.message,
        });
      }

      throw error;
    }
  }

  private readSchema(value: Prisma.JsonValue, slug: string): PageSchema {
    return this.parseSchema(value, slug);
  }

  private toJson(schema: PageSchema): Prisma.InputJsonValue {
    return schema as unknown as Prisma.InputJsonValue;
  }

  private notFound(message: string) {
    return new NotFoundException({
      code: apiErrorCodes.NOT_FOUND,
      message,
    });
  }
}
