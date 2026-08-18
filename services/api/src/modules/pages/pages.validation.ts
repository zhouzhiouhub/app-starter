import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import { ZodError } from "zod";
import {
  createPageInputSchema,
  listPagesQuerySchema,
  pageSlugSchema,
  parsePageSchema,
  rollbackPageInputSchema,
  unwrapBodyData,
  type CreatePageInput,
  type RollbackPageInput,
} from "./pages.mapper.js";

export function parseListPagesQuery(query: {
  page?: string | number;
  limit?: string | number;
}) {
  return parseOrThrow(() => listPagesQuerySchema.parse(query));
}

export function parseCreateInput(body: unknown): CreatePageInput {
  return parseOrThrow(() =>
    createPageInputSchema.parse(unwrapBodyData(body)),
  );
}

export function parseRollbackInput(body: unknown): RollbackPageInput {
  return parseOrThrow(() =>
    rollbackPageInputSchema.parse(unwrapBodyData(body)),
  );
}

export function parseSlug(slug: string): string {
  return parseOrThrow(() => pageSlugSchema.parse(slug));
}

export function parseSchema(body: unknown, slug: string): PageSchema {
  return parseOrThrow(() => parsePageSchema(body, slug));
}

export function readSchema(value: Prisma.JsonValue, slug: string): PageSchema {
  return parseSchema(value, slug);
}

export function toJson(schema: PageSchema): Prisma.InputJsonValue {
  return schema as unknown as Prisma.InputJsonValue;
}

export function notFound(message: string) {
  return new NotFoundException({
    code: apiErrorCodes.NOT_FOUND,
    message,
  });
}

function parseOrThrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.issues[0]?.message ?? "Invalid request.",
        details: error.flatten(),
      });
    }

    if (error instanceof Error && error.message.startsWith("Request body")) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        message: error.message,
      });
    }

    throw error;
  }
}
