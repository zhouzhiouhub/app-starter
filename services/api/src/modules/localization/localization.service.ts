import { ConflictException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { apiErrorCodes, translationEntryMaxCount } from "@app-starter/schema";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toTranslationResponse } from "./localization.mapper.js";
import {
  parseListTranslationsQuery,
  resolveTranslationLocale,
} from "./localization.validation.js";
import { upsertTranslation } from "./use-cases/upsert-translation.js";

@Injectable()
export class LocalizationService {
  constructor(private readonly prisma: PrismaService) {}

  async listTranslations(
    actor: Actor,
    query?: unknown,
    requestId = "local-dev",
  ) {
    const input = parseListTranslationsQuery(query);
    const localeContext = resolveTranslationLocale(input.locale);
    const where = createTranslationWhere({
      locale: localeContext.locale,
      namespace: input.namespace,
      query: input.q,
      tenantId: actor.tenantId,
    });
    const translations = await this.prisma.translation.findMany({
      orderBy: { key: "asc" },
      take: translationEntryMaxCount,
      where,
    });

    return {
      data: translations.map(toTranslationResponse),
      meta: {
        requestId,
        tenantId: actor.tenantId,
        entryLimit: translationEntryMaxCount,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
        namespace: input.namespace,
        query: input.q,
      },
    };
  }

  async upsertTranslation(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return upsertTranslation(
      this.prisma,
      body,
      idempotencyKey,
      actor,
      requestId,
    );
  }

  rejectTranslationBulkOperation(
    operation: "export" | "import",
    requestId = "local-dev",
  ): never {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message: `Translation ${operation} is reserved for a later localization phase.`,
      requestId,
    });
  }
}

function createTranslationWhere(input: {
  locale: string;
  namespace?: string;
  query?: string;
  tenantId: string;
}): Prisma.TranslationWhereInput {
  const filters: Prisma.TranslationWhereInput[] = [];

  if (input.namespace) {
    filters.push({
      OR: [
        { key: input.namespace },
        { key: { startsWith: `${input.namespace}.` } },
      ],
    });
  }

  if (input.query) {
    filters.push({
      OR: [
        { key: { contains: input.query } },
        { value: { contains: input.query } },
        { context: { contains: input.query } },
      ],
    });
  }

  return {
    ...(filters.length ? { AND: filters } : {}),
    locale: input.locale,
    tenantId: input.tenantId,
  };
}
