import { NotFoundException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

export function throwPublicProductUnavailable(requestId: string): never {
  throw new NotFoundException({
    code: apiErrorCodes.NOT_FOUND,
    message: "Public product pages are reserved for Phase 2.",
    requestId,
  });
}
