import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes } from "@app-starter/schema";
import { runTenantIdempotent } from "../../../common/idempotency-record.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  toTranslationResponse,
  type TranslationRecord,
} from "../localization.mapper.js";
import {
  createTranslationImportPlan,
  toTranslationImportResponseRow,
  type ResolvedTranslationImportEntry,
  type TranslationImportPlan,
  type TranslationImportPlanRow,
  type WritableTranslationImportAction,
} from "../localization.translation-import-plan.js";

type WritableTranslationImportRow = TranslationImportPlanRow & {
  action: WritableTranslationImportAction;
  data: ResolvedTranslationImportEntry;
};

interface WrittenTranslationImportRow {
  action: WritableTranslationImportAction;
  index: number;
  translation: TranslationRecord;
}

export async function importTranslations(
  prisma: PrismaService,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const plan = await createTranslationImportPlan(prisma, body, actor);
  assertTranslationImportPlanWritable(plan, requestId);

  const rows = plan.rows.filter(isWritableTranslationImportRow);

  return runTenantIdempotent(prisma, {
    body: toNormalizedImportBody(rows),
    key: idempotencyKey,
    scope: "translations:import",
    tenantId: actor.tenantId,
    operation: async () => {
      const writtenRows: WrittenTranslationImportRow[] = [];

      for (const row of rows) {
        const translation = await upsertImportedTranslation(prisma, actor, row);
        writtenRows.push({
          action: row.action,
          index: row.index,
          translation,
        });
      }

      await prisma.auditLog.create({
        data: {
          action: "translation.imported",
          actorId: actor.id,
          metadata: {
            createdCount: plan.summary.createCount,
            defaultLocale: plan.defaultLocale,
            importedCount: writtenRows.length,
            multiLocaleEnabled: plan.multiLocaleEnabled,
            totalEntries: plan.summary.totalEntries,
            updatedCount: plan.summary.updateCount,
          } as Prisma.InputJsonValue,
          requestId,
          targetId: "translations",
          targetType: "translation-import",
          tenantId: actor.tenantId,
        },
      });

      return {
        data: {
          entries: writtenRows.map(toWrittenTranslationImportResponseRow),
          summary: {
            createdCount: plan.summary.createCount,
            importedCount: writtenRows.length,
            totalEntries: plan.summary.totalEntries,
            updatedCount: plan.summary.updateCount,
          },
        },
        meta: {
          requestId,
          tenantId: actor.tenantId,
          defaultLocale: plan.defaultLocale,
          importVersion: "translation-import.v1",
          multiLocaleEnabled: plan.multiLocaleEnabled,
        },
      };
    },
  });
}

function assertTranslationImportPlanWritable(
  plan: TranslationImportPlan,
  requestId: string,
): void {
  const { blockedCount, duplicateCount, errorCount } = plan.summary;

  if (blockedCount === 0 && duplicateCount === 0 && errorCount === 0) {
    return;
  }

  const details = {
    entries: plan.rows
      .filter((row) => row.issues.length > 0)
      .map(toTranslationImportResponseRow),
    summary: plan.summary,
  };

  if (blockedCount > 0 && duplicateCount === 0 && errorCount === 0) {
    throw new ConflictException({
      code: apiErrorCodes.MULTI_LOCALE_DISABLED,
      details,
      message:
        "Translation import contains non-default Locale rows while multi-locale is disabled.",
      requestId,
    });
  }

  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    details,
    message: "Translation import contains invalid rows.",
    requestId,
  });
}

async function upsertImportedTranslation(
  prisma: PrismaService,
  actor: Actor,
  row: WritableTranslationImportRow,
) {
  return prisma.translation.upsert({
    create: {
      context: row.data.context ?? null,
      key: row.data.key,
      locale: row.data.locale,
      tenantId: actor.tenantId,
      value: row.data.value,
    },
    update: {
      ...(row.data.context === undefined ? {} : { context: row.data.context }),
      value: row.data.value,
    },
    where: {
      tenantId_key_locale: {
        key: row.data.key,
        locale: row.data.locale,
        tenantId: actor.tenantId,
      },
    },
  });
}

function toWrittenTranslationImportResponseRow(
  row: WrittenTranslationImportRow,
) {
  return {
    action: row.action,
    index: row.index,
    ...toTranslationResponse(row.translation),
  };
}

function isWritableTranslationImportRow(
  row: TranslationImportPlanRow,
): row is WritableTranslationImportRow {
  return (
    Boolean(row.data) && (row.action === "create" || row.action === "update")
  );
}

function toNormalizedImportBody(rows: WritableTranslationImportRow[]) {
  return {
    entries: rows.map((row) => ({
      context: row.data.context ?? null,
      key: row.data.key,
      locale: row.data.locale,
      value: row.data.value,
    })),
  };
}
