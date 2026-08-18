import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import { ZodError } from "zod";
import { PrismaService } from "../prisma/prisma.service.js";
import { DEFAULT_SITE_DOMAIN, SYSTEM_AUTHOR_ID } from "./pages.constants.js";
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

const pageVersionSelect = {
  id: true,
  version: true,
  status: true,
  publishedAt: true,
  createdAt: true,
} as const;

type DefaultSiteContext = {
  id: string;
  tenantId: string;
};

type IdempotencyOptions<TResponse> = {
  body: unknown;
  key: string | undefined;
  operation: () => Promise<TResponse>;
  scope: string;
  site: DefaultSiteContext;
};

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { page?: string | number; limit?: string | number }) {
    const { page, limit } = this.parseOrThrow(() =>
      listPagesQuerySchema.parse(query),
    );
    const site = await this.getDefaultSite();
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

  async getById(id: string) {
    const site = await this.getDefaultSite();
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

  async create(body: unknown, idempotencyKey?: string) {
    const site = await this.getDefaultSite();
    const input = this.parseCreateInput(body);
    const schema = createInitialPageSchema(input);
    const type = input.type ?? resolvePageType(input.slug, input.templateId);

    return this.runIdempotent({
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
                  authorId: SYSTEM_AUTHOR_ID,
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

  async saveDraft(id: string, body: unknown, idempotencyKey?: string) {
    const site = await this.getDefaultSite();

    return this.runIdempotent({
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
                authorId: SYSTEM_AUTHOR_ID,
              },
            });
          } else {
            await tx.pageVersion.create({
              data: {
                pageId: current.id,
                version: nextVersionNumber(latest?.version),
                schema: this.toJson(schema),
                status: "draft",
                authorId: SYSTEM_AUTHOR_ID,
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
    idempotencyKey?: string,
  ) {
    const site = await this.getDefaultSite();
    return this.runIdempotent({
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

          const publishedVersion = await this.persistPublishedVersion(
            tx,
            current.id,
            latest,
            parsed,
          );

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

  async publishBySlug(slug: string, body: unknown, idempotencyKey?: string) {
    const site = await this.getDefaultSite();
    const normalizedSlug = this.parseSlug(slug);
    const schema = this.parseSchema(body, normalizedSlug);

    return this.runIdempotent({
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
          const created = await this.create({
            slug: normalizedSlug,
            title: schema.meta.title,
            type: resolvePageType(normalizedSlug),
          });
          return this.publish(created.data.id, schema);
        }

        return this.publish(page.id, schema);
      },
    });
  }

  async getPublishedBySlug(slug: string): Promise<PageSchema | null> {
    const site = await this.getDefaultSite();
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

  private async persistPublishedVersion(
    tx: Prisma.TransactionClient,
    pageId: string,
    latest: { id: string; version: number; status: string } | undefined,
    schema: PageSchema,
  ) {
    if (latest && latest.status !== "published") {
      return tx.pageVersion.update({
        where: { id: latest.id },
        data: {
          schema: this.toJson(schema),
          status: "published",
          publishedAt: new Date(),
          authorId: SYSTEM_AUTHOR_ID,
        },
        select: pageVersionSelect,
      });
    }

    if (latest && latest.status === "published") {
      return tx.pageVersion.create({
        data: {
          pageId,
          version: nextVersionNumber(latest.version),
          schema: this.toJson(schema),
          status: "published",
          publishedAt: new Date(),
          authorId: SYSTEM_AUTHOR_ID,
        },
        select: pageVersionSelect,
      });
    }

    return tx.pageVersion.create({
      data: {
        pageId,
        version: 1,
        schema: this.toJson(schema),
        status: "published",
        publishedAt: new Date(),
        authorId: SYSTEM_AUTHOR_ID,
      },
      select: pageVersionSelect,
    });
  }

  private async runIdempotent<TResponse>(
    options: IdempotencyOptions<TResponse>,
  ): Promise<TResponse> {
    const key = options.key;

    if (!key) {
      return options.operation();
    }

    const requestHash = hashPayload(options.body);
    const where = {
      tenantId_scope_key: {
        tenantId: options.site.tenantId,
        scope: options.scope,
        key,
      },
    };
    const existing = await this.prisma.idempotencyRecord.findUnique({ where });

    if (existing) {
      return this.readIdempotencyResponse<TResponse>(existing, requestHash);
    }

    let record: { id: string };

    try {
      record = await this.prisma.idempotencyRecord.create({
        data: {
          tenantId: options.site.tenantId,
          scope: options.scope,
          key,
          requestHash,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const current = await this.prisma.idempotencyRecord.findUnique({
          where,
        });

        if (current) {
          return this.readIdempotencyResponse<TResponse>(current, requestHash);
        }
      }

      throw error;
    }

    try {
      const response = await options.operation();

      await this.prisma.idempotencyRecord.update({
        where: { id: record.id },
        data: {
          status: "completed",
          response: this.toJsonValue(response),
        },
      });

      return response;
    } catch (error) {
      await this.prisma.idempotencyRecord.deleteMany({
        where: { id: record.id, status: "pending" },
      });

      throw error;
    }
  }

  private readIdempotencyResponse<TResponse>(
    record: {
      requestHash: string;
      response: Prisma.JsonValue | null;
      status: string;
    },
    requestHash: string,
  ): TResponse {
    if (record.requestHash !== requestHash) {
      throw new ConflictException({
        code: apiErrorCodes.CONFLICT,
        message:
          "Idempotency-Key has already been used with a different request body.",
      });
    }

    if (record.status !== "completed" || record.response === null) {
      throw new ConflictException({
        code: apiErrorCodes.CONFLICT,
        message: "A request with this Idempotency-Key is already in progress.",
      });
    }

    return record.response as TResponse;
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

  private async getDefaultSite() {
    const site = await this.prisma.site.findUnique({
      where: { domain: DEFAULT_SITE_DOMAIN },
    });

    if (!site) {
      throw new ServiceUnavailableException({
        code: apiErrorCodes.INTERNAL_ERROR,
        message:
          "Default site is missing. Run `pnpm --filter @app-starter/api run prisma:seed`.",
      });
    }

    return site;
  }

  private readSchema(value: Prisma.JsonValue, slug: string): PageSchema {
    return this.parseSchema(value, slug);
  }

  private toJson(schema: PageSchema): Prisma.InputJsonValue {
    return schema as unknown as Prisma.InputJsonValue;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private notFound(message: string) {
    return new NotFoundException({
      code: apiErrorCodes.NOT_FOUND,
      message,
    });
  }
}

function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeForHash(payload)) ?? "null")
    .digest("hex");
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalizeForHash(child)]),
  );
}
