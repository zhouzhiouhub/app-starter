import { createHash } from "node:crypto";
import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes } from "@app-starter/schema";
import type { PrismaService } from "../modules/prisma/prisma.service.js";

export async function runTenantIdempotent<TResponse>(
  prisma: PrismaService,
  options: {
    body: unknown;
    key: string | undefined;
    operation: () => Promise<TResponse>;
    scope: string;
    tenantId: string;
  },
): Promise<TResponse> {
  const key = options.key;

  if (!key) {
    return options.operation();
  }

  const requestHash = hashPayload(options.body);
  const where = {
    tenantId_scope_key: {
      tenantId: options.tenantId,
      scope: options.scope,
      key,
    },
  };
  const existing = await prisma.idempotencyRecord.findUnique({ where });

  if (existing) {
    return readIdempotencyResponse<TResponse>(existing, requestHash);
  }

  let record: { id: string };

  try {
    record = await prisma.idempotencyRecord.create({
      data: {
        tenantId: options.tenantId,
        scope: options.scope,
        key,
        requestHash,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const current = await prisma.idempotencyRecord.findUnique({ where });

      if (current) {
        return readIdempotencyResponse<TResponse>(current, requestHash);
      }
    }

    throw error;
  }

  try {
    const response = await options.operation();

    await prisma.idempotencyRecord.update({
      where: { id: record.id },
      data: {
        status: "completed",
        response: response as Prisma.InputJsonValue,
      },
    });

    return response;
  } catch (error) {
    await prisma.idempotencyRecord.deleteMany({
      where: { id: record.id, status: "pending" },
    });

    throw error;
  }
}

function readIdempotencyResponse<TResponse>(
  record: {
    requestHash: string;
    response: Prisma.JsonValue | null;
    status: string;
  },
  requestHash: string,
): TResponse {
  if (record.requestHash !== requestHash) {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message:
        "Idempotency-Key has already been used with a different request body.",
    });
  }

  if (record.status !== "completed" || record.response === null) {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message: "A request with this Idempotency-Key is already in progress.",
    });
  }

  return record.response as TResponse;
}

function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeForHash(payload)) ?? "null")
    .digest("hex");
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForHash(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, normalizeForHash(child)]),
  );
}
