import { NotFoundException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { throwCommerceDisabled } from "./commerce-disabled.js";

export function throwAdminProductUnavailable(requestId: string): never {
  throw new NotFoundException({
    code: apiErrorCodes.NOT_FOUND,
    message: "Product details are reserved for Phase 2.",
    requestId,
  });
}

export function throwAdminProductWriteDisabled(requestId: string): never {
  return throwCommerceDisabled({
    message: "Product writes are reserved for Phase 2.",
    requestId,
  });
}
