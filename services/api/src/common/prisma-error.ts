import { ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes } from "@app-starter/schema";

const SCHEMA_MISSING_CODES = new Set(["P2021", "P2022"]);

export function mapPrismaException(exception: unknown): unknown {
  if (
    exception instanceof Prisma.PrismaClientKnownRequestError &&
    SCHEMA_MISSING_CODES.has(exception.code)
  ) {
    return new ServiceUnavailableException({
      code: apiErrorCodes.INTERNAL_ERROR,
      message:
        "Database schema is out of date. Run `pnpm --filter @app-starter/api run prisma:push`.",
    });
  }

  return exception;
}
