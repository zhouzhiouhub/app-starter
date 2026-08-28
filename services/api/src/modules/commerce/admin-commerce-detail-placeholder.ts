import { NotFoundException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import {
  createCommerceReservedDetailDetails,
  type CommerceReservedDetailResource,
} from "./commerce-reserved-detail-details.js";

type AdminCommerceDetailResource = Extract<
  CommerceReservedDetailResource,
  "order" | "payment"
>;

const detailMessages: Record<AdminCommerceDetailResource, string> = {
  order: "Order details are reserved for Phase 2.",
  payment: "Payment details are reserved for Phase 2.",
};

export function throwAdminCommerceDetailUnavailable(
  resource: AdminCommerceDetailResource,
  requestId: string,
): never {
  throw new NotFoundException({
    code: apiErrorCodes.NOT_FOUND,
    details: createCommerceReservedDetailDetails({
      resource,
      surface: "admin",
    }),
    message: detailMessages[resource],
    requestId,
  });
}
