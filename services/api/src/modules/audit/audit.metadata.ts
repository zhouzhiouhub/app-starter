import type { Prisma } from "@prisma/client";

const redactedValue = "[redacted]";
const sensitiveMetadataKeys = new Set([
  "accesskeyid",
  "accesstoken",
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "password",
  "refreshtoken",
  "schema",
  "secret",
  "secretaccesskey",
  "session",
  "sessionid",
  "setcookie",
  "signature",
  "token",
]);

export function sanitizeAuditMetadata(value: unknown): unknown {
  const sanitized = sanitizeAuditMetadataValue(value);
  return sanitized ?? {};
}

export function sanitizeAuditMetadataForStorage(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue {
  return sanitizeAuditMetadataValue(value ?? {}) as Prisma.InputJsonValue;
}

function sanitizeAuditMetadataValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditMetadataValue(item));
  }

  if (!value || typeof value !== "object") {
    return isJsonPrimitive(value) ? value : null;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      shouldRedactMetadataKey(key)
        ? redactedValue
        : sanitizeAuditMetadataValue(child),
    ]),
  );
}

function shouldRedactMetadataKey(key: string): boolean {
  const normalized = key.replace(/[-_]/g, "").toLowerCase();

  return (
    sensitiveMetadataKeys.has(normalized) ||
    normalized.endsWith("accesskeyid") ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("credential") ||
    normalized.endsWith("cookie") ||
    normalized.endsWith("password") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("secretaccesskey") ||
    normalized.endsWith("session") ||
    normalized.endsWith("sessionid") ||
    normalized.endsWith("signature") ||
    normalized.endsWith("token")
  );
}

function isJsonPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}
