import { NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes } from "@app-starter/schema";
import { runTenantIdempotent } from "../../../common/idempotency-record.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toTranslationResponse } from "../localization.mapper.js";
import {
  parseTranslationId,
  parseUpdateTranslationInput,
  resolveWritableTranslationLocale,
} from "../localization.validation.js";

export async function updateTranslation(
  prisma: PrismaService,
  id: string,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const translationId = parseTranslationId(id);
  const input = parseUpdateTranslationInput(body);
  const normalizedInput = {
    context: input.context,
    id: translationId,
    value: input.value,
  };

  return runTenantIdempotent(prisma, {
    body: normalizedInput,
    key: idempotencyKey,
    scope: `translations:${translationId}:update`,
    tenantId: actor.tenantId,
    operation: () =>
      updateExistingTranslation(prisma, {
        actor,
        input,
        requestId,
        translationId,
      }),
  });
}

async function updateExistingTranslation(
  prisma: PrismaService,
  {
    actor,
    input,
    requestId,
    translationId,
  }: {
    actor: Actor;
    input: {
      context?: string | null;
      value?: string;
    };
    requestId: string;
    translationId: string;
  },
) {
  const existingTranslation = await prisma.translation.findFirst({
    where: {
      id: translationId,
      tenantId: actor.tenantId,
    },
  });

  if (!existingTranslation) {
    throw new NotFoundException({
      code: apiErrorCodes.NOT_FOUND,
      message: "Translation was not found.",
      requestId,
    });
  }

  const localeContext = resolveWritableTranslationLocale(
    existingTranslation.locale,
  );
  const updatedTranslation = await prisma.translation.update({
    data: {
      ...(input.context === undefined ? {} : { context: input.context }),
      ...(input.value === undefined ? {} : { value: input.value }),
    },
    where: {
      id: existingTranslation.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "translation.updated",
      actorId: actor.id,
      metadata: {
        contextChanged:
          input.context !== undefined &&
          input.context !== existingTranslation.context,
        contextConfigured: updatedTranslation.context !== null,
        key: existingTranslation.key,
        locale: existingTranslation.locale,
        valueChanged:
          input.value !== undefined &&
          input.value !== existingTranslation.value,
      } as Prisma.InputJsonValue,
      requestId,
      targetId: updatedTranslation.id,
      targetType: "translation",
      tenantId: actor.tenantId,
    },
  });

  return {
    data: toTranslationResponse(updatedTranslation),
    meta: {
      requestId,
      tenantId: actor.tenantId,
      locale: localeContext.locale,
      fallbackLocale: localeContext.fallbackLocale,
      isFallback: false,
      writeMode: "updated",
    },
  };
}
