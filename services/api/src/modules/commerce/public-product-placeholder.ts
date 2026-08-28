import { NotFoundException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { createCommerceReservedDetailDetails } from "./commerce-reserved-detail-details.js";

export function throwPublicProductUnavailable(requestId: string): never {
  throw new NotFoundException({
    code: apiErrorCodes.NOT_FOUND,
    details: createCommerceReservedDetailDetails({
      resource: "product",
      surface: "public",
    }),
    message: "Public product pages are reserved for Phase 2.",
    requestId,
  });
}
