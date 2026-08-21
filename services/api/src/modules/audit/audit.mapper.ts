import type { Prisma } from "@prisma/client";
import { sanitizeAuditMetadata } from "./audit.metadata.js";
import type { AuditLogResponse } from "./audit.types.js";

export function toAuditLogResponse(log: {
  action: string;
  actorId: string | null;
  createdAt: Date;
  id: string;
  metadata: Prisma.JsonValue;
  requestId: string | null;
  targetId: string | null;
  targetType: string;
}): AuditLogResponse {
  return {
    id: log.id,
    action: log.action,
    actorId: log.actorId,
    createdAt: log.createdAt.toISOString(),
    metadata: sanitizeAuditMetadata(log.metadata),
    requestId: log.requestId,
    targetId: log.targetId,
    targetType: log.targetType,
  };
}
