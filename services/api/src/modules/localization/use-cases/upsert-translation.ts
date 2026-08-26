import { Prisma } from "@prisma/client";
import { runTenantIdempotent } from "../../../common/idempotency-record.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toTranslationResponse } from "../localization.mapper.js";
import {
  parseUpsertTranslationInput,
  resolveWritableTranslationLocale,
} from "../localization.validation.js";

export async function upsertTranslation(
  prisma: PrismaService,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const input = parseUpsertTranslationInput(body);
  const localeContext = resolveWritableTranslationLocale(input.locale);
  const normalizedInput = {
    context: input.context ?? null,
    key: input.key,
    locale: localeContext.locale,
    value: input.value,
  };

  return runTenantIdempotent(prisma, {
    body: normalizedInput,
    key: idempotencyKey,
    scope: `translations:${localeContext.locale}:${input.key}:upsert`,
    tenantId: actor.tenantId,
    operation: async () => {
      const existingTranslation = await prisma.translation.findUnique({
        where: {
          tenantId_key_locale: {
            key: input.key,
            locale: localeContext.locale,
            tenantId: actor.tenantId,
          },
        },
      });
      const writeMode = existingTranslation ? "updated" : "created";
      const translation = await prisma.translation.upsert({
        create: {
          context: input.context ?? null,
          key: input.key,
          locale: localeContext.locale,
          tenantId: actor.tenantId,
          value: input.value,
        },
        update: {
          ...(input.context === undefined ? {} : { context: input.context }),
          value: input.value,
        },
        where: {
          tenantId_key_locale: {
            key: input.key,
            locale: localeContext.locale,
            tenantId: actor.tenantId,
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "translation.upserted",
          actorId: actor.id,
          metadata: {
            contextConfigured: translation.context !== null,
            key: input.key,
            locale: localeContext.locale,
            writeMode,
          } as Prisma.InputJsonValue,
          requestId,
          targetId: translation.id,
          targetType: "translation",
          tenantId: actor.tenantId,
        },
      });

      return {
        data: toTranslationResponse(translation),
        meta: {
          requestId,
          tenantId: actor.tenantId,
          locale: localeContext.locale,
          fallbackLocale: localeContext.fallbackLocale,
          isFallback: false,
          writeMode,
        },
      };
    },
  });
}
