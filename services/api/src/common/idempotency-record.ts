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
    replayResponse?: (response: TResponse) => Promise<TResponse> | TResponse;
    scope: string;
    storeResponse?: boolean;
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
    return replayIdempotencyResponse(
      readIdempotencyResponse<TResponse>(existing, requestHash),
      options.replayResponse,
    );
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
        return replayIdempotencyResponse(
          readIdempotencyResponse<TResponse>(current, requestHash),
          options.replayResponse,
        );
      }
    }

    throw error;
  }

  let operationCompleted = false;

  try {
    const response = await options.operation();
    operationCompleted = true;

    await prisma.idempotencyRecord.update({
      where: { id: record.id },
      data: {
        status: "completed",
        ...(options.storeResponse === false
          ? {}
          : { response: response as Prisma.InputJsonValue }),
      },
    });

    return response;
  } catch (error) {
    if (!operationCompleted) {
      await prisma.idempotencyRecord.deleteMany({
        where: { id: record.id, status: "pending" },
      });
    }

    throw error;
  }
}

function replayIdempotencyResponse<TResponse>(
  response: TResponse,
  replayResponse: ((response: TResponse) => Promise<TResponse> | TResponse) |
    undefined,
): Promise<TResponse> | TResponse {
  return replayResponse ? replayResponse(response) : response;
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

  if (record.status !== "completed") {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message: "A request with this Idempotency-Key is already in progress.",
    });
  }

  if (record.response === null) {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message:
        "Response for this Idempotency-Key is not replayable. Retry with a new Idempotency-Key.",
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
