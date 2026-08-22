import type { PageSchema } from "@app-starter/schema";
import type { Prisma } from "@prisma/client";
import type { Actor } from "../identity/identity.types.js";

type AuditTransaction = Pick<Prisma.TransactionClient, "auditLog">;

type PageAuditSite = {
  id: string;
  tenantId: string;
};

type PageAuditInput = {
  actor: Actor;
  pageId: string;
  requestId: string;
  schema: PageSchema;
  site: PageAuditSite;
};

export async function recordPagePublishedAudit(
  client: AuditTransaction,
  input: PageAuditInput & { publishedVersionId: string },
) {
  await client.auditLog.create({
    data: createPageAuditData(input, "page.published", {
      publishedVersionId: input.publishedVersionId,
    }),
  });
}

export async function recordPageRollbackAudit(
  client: AuditTransaction,
  input: PageAuditInput & {
    rollbackVersionId: string;
    targetVersionId: string;
  },
) {
  await client.auditLog.create({
    data: createPageAuditData(input, "page.rolled_back", {
      rollbackVersionId: input.rollbackVersionId,
      targetVersionId: input.targetVersionId,
    }),
  });
}

function createPageAuditData(
  input: PageAuditInput,
  action: string,
  metadata: Record<string, string>,
) {
  return {
    action,
    actorId: input.actor.id,
    metadata: {
      ...metadata,
      locale: input.schema.meta.locale,
      market: input.schema.meta.market,
      siteId: input.site.id,
      slug: input.schema.meta.slug,
    } as Prisma.InputJsonValue,
    requestId: input.requestId,
    targetId: input.pageId,
    targetType: "page",
    tenantId: input.site.tenantId,
  };
}
