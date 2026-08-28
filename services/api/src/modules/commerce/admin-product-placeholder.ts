import { NotFoundException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { throwCommerceDisabled } from "./commerce-disabled.js";
import { createCommerceReservedDetailDetails } from "./commerce-reserved-detail-details.js";

export function throwAdminProductUnavailable(requestId: string): never {
  throw new NotFoundException({
    code: apiErrorCodes.NOT_FOUND,
    details: createCommerceReservedDetailDetails({
      resource: "product",
      surface: "admin",
    }),
    message: "Product details are reserved for Phase 2.",
    requestId,
  });
}

export function throwAdminProductWriteDisabled(
  action: "create" | "update",
  requestId: string,
): never {
  return throwCommerceDisabled({
    action,
    message: "Product writes are reserved for Phase 2.",
    requestId,
    resource: "product",
  });
}
