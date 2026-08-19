import type { Prisma } from "@prisma/client";
import type { AuditLogResponse } from "./audit.types.js";

const redactedValue = "[redacted]";
const sensitiveMetadataKeys = new Set([
  "accesstoken",
  "authorization",
  "password",
  "refreshtoken",
  "schema",
  "secret",
  "token",
]);

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

export function sanitizeAuditMetadata(value: Prisma.JsonValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return value ?? {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      shouldRedactMetadataKey(key)
        ? redactedValue
        : sanitizeAuditMetadata(child ?? null),
    ]),
  );
}

function shouldRedactMetadataKey(key: string): boolean {
  const normalized = key.replace(/[-_]/g, "").toLowerCase();

  return (
    sensitiveMetadataKeys.has(normalized) ||
    normalized.endsWith("password") ||
    normalized.endsWith("secret")
  );
}
