import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  createTranslationImportPlan,
  toTranslationImportResponseRow,
} from "../localization.translation-import-plan.js";

export async function previewTranslationImport(
  prisma: PrismaService,
  body: unknown,
  actor: Actor,
  requestId = "local-dev",
) {
  const plan = await createTranslationImportPlan(prisma, body, actor);

  return {
    data: {
      entries: plan.rows.map(toTranslationImportResponseRow),
      summary: plan.summary,
    },
    meta: {
      requestId,
      tenantId: actor.tenantId,
      defaultLocale: plan.defaultLocale,
      multiLocaleEnabled: plan.multiLocaleEnabled,
      preview: true,
    },
  };
}
