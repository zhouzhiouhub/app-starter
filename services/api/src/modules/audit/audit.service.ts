import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { toAuditLogResponse } from "./audit.mapper.js";
import { sanitizeAuditMetadataForStorage } from "./audit.metadata.js";
import type { AuditLogInput, ListAuditLogsQuery } from "./audit.types.js";
import { parseListAuditLogsQuery } from "./audit.validation.js";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        metadata: sanitizeAuditMetadataForStorage(input.metadata),
        requestId: input.requestId ?? null,
        targetId: input.targetId ?? null,
        targetType: input.targetType,
        tenantId: input.tenantId,
      },
    });
  }

  async list(
    query: ListAuditLogsQuery,
    actor: { tenantId: string },
    requestId = "local-dev",
  ) {
    const input = parseListAuditLogsQuery(query);
    const skip = (input.page - 1) * input.limit;
    const where: Prisma.AuditLogWhereInput = {
      tenantId: actor.tenantId,
      ...(input.action ? { action: input.action } : {}),
      ...(input.actorId ? { actorId: input.actorId } : {}),
      ...(input.targetId ? { targetId: input.targetId } : {}),
      ...(input.targetType ? { targetType: input.targetType } : {}),
    };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: input.limit,
      }),
    ]);

    return {
      data: logs.map(toAuditLogResponse),
      meta: {
        requestId,
        tenantId: actor.tenantId,
        total,
        page: input.page,
        limit: input.limit,
      },
    };
  }
}
