import { runTenantIdempotent } from "../../common/idempotency-record.js";
import type { PrismaService } from "../prisma/prisma.service.js";

export type IdempotencySite = {
  id: string;
  tenantId: string;
};

export async function runIdempotent<TResponse>(
  prisma: PrismaService,
  options: {
    body: unknown;
    key: string | undefined;
    operation: () => Promise<TResponse>;
    scope: string;
    site: IdempotencySite;
  },
): Promise<TResponse> {
  return runTenantIdempotent(prisma, {
    body: options.body,
    key: options.key,
    operation: options.operation,
    scope: options.scope,
    tenantId: options.site.tenantId,
  });
}
