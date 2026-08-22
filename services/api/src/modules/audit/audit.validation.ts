import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { z, ZodError } from "zod";
import type { ListAuditLogsQuery } from "./audit.types.js";

const auditFilterSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_.:-]+$/, {
    message: "Audit filters may only contain letters, numbers, dots, colons, dashes, and underscores.",
  });

export const listAuditLogsQuerySchema = z.object({
  action: auditFilterSchema.optional(),
  actorId: auditFilterSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  targetId: auditFilterSchema.optional(),
  targetType: auditFilterSchema.optional(),
});

export function parseListAuditLogsQuery(query: ListAuditLogsQuery) {
  try {
    return listAuditLogsQuerySchema.parse(query);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.issues[0]?.message ?? "Invalid audit log query.",
        details: error.flatten(),
      });
    }

    throw error;
  }
}
