import { Injectable } from "@nestjs/common";
import { translationEntryMaxCount } from "@app-starter/schema";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toTranslationResponse } from "./localization.mapper.js";
import { createTranslationWhere } from "./localization.translation-filters.js";
import { readTranslationCoverage } from "./localization.translation-coverage.js";
import {
  parseListTranslationsQuery,
  resolveTranslationLocale,
} from "./localization.validation.js";
import { exportTranslations as exportTranslationsUseCase } from "./use-cases/export-translations.js";
import { importTranslations as importTranslationsUseCase } from "./use-cases/import-translations.js";
import { previewTranslationExport } from "./use-cases/preview-translation-export.js";
import { previewTranslationImport } from "./use-cases/preview-translation-import.js";
import { updateTranslation } from "./use-cases/update-translation.js";
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
    const skip = (input.page - 1) * input.limit;
    const [total, translations, coverage] = await Promise.all([
      this.prisma.translation.count({ where }),
      this.prisma.translation.findMany({
        orderBy: { key: "asc" },
        skip,
        take: input.limit,
        where,
      }),
      readTranslationCoverage(this.prisma, {
        locale: localeContext.locale,
        namespace: input.namespace,
        query: input.q,
        tenantId: actor.tenantId,
      }),
    ]);

    return {
      data: translations.map(toTranslationResponse),
      meta: {
        requestId,
        tenantId: actor.tenantId,
        entryLimit: translationEntryMaxCount,
        total,
        page: input.page,
        limit: input.limit,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
        namespace: input.namespace,
        query: input.q,
        ...coverage,
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

  async updateTranslation(
    id: string,
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return updateTranslation(
      this.prisma,
      id,
      body,
      idempotencyKey,
      actor,
      requestId,
    );
  }

  previewTranslationImport(
    body: unknown,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return previewTranslationImport(this.prisma, body, actor, requestId);
  }

  importTranslations(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return importTranslationsUseCase(
      this.prisma,
      body,
      idempotencyKey,
      actor,
      requestId,
    );
  }

  previewTranslationExport(
    body: unknown,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return previewTranslationExport(this.prisma, body, actor, requestId);
  }

  exportTranslations(body: unknown, actor: Actor, requestId = "local-dev") {
    return exportTranslationsUseCase(this.prisma, body, actor, requestId);
  }
}
