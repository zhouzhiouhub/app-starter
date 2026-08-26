import { NotFoundException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

type AdminCommerceDetailResource = "order" | "payment";

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
    message: detailMessages[resource],
    requestId,
  });
}
