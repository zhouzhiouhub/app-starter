import { ConflictException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

const defaultCommerceDisabledMessage =
  "Commerce is reserved in MVP and disabled by default.";

export function throwCommerceDisabled(input: {
  message?: string;
  requestId: string;
}): never {
  throw new ConflictException({
    code: apiErrorCodes.COMMERCE_DISABLED,
    message: input.message ?? defaultCommerceDisabledMessage,
    requestId: input.requestId,
  });
}
