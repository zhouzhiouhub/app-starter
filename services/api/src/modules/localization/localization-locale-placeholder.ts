import { ConflictException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

export function throwLocaleMutationDisabled(
  operation: "create" | "update",
  requestId: string,
): never {
  throw new ConflictException({
    code: apiErrorCodes.MULTI_LOCALE_DISABLED,
    message: `Cannot ${operation} locales while multi-locale is disabled.`,
    requestId,
  });
}

export function throwLocaleMutationReserved(
  operation: "create" | "update",
  requestId: string,
): never {
  throw new ConflictException({
    code: apiErrorCodes.CONFLICT,
    message: `Locale ${operation} is reserved until locale persistence is implemented.`,
    requestId,
  });
}
