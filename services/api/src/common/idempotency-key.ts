import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { z } from "zod";

export const idempotencyKeySchema = z.string().uuid();

export function requireIdempotencyKey(value: unknown): string {
  const parsed = idempotencyKeySchema.safeParse(value);

  if (!parsed.success) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Idempotency-Key header must be a UUID.",
    });
  }

  return parsed.data;
}
