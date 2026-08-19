import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import type { AuditLogInput } from "./audit.types.js";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        requestId: input.requestId ?? null,
        targetId: input.targetId ?? null,
        targetType: input.targetType,
        tenantId: input.tenantId,
      },
    });
  }
}
