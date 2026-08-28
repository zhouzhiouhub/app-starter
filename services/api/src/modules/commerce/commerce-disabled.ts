import { ConflictException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import {
  createCommerceDisabledDetails,
  type CommerceDisabledAction,
  type CommerceDisabledResource,
} from "./commerce-disabled-details.js";

const defaultCommerceDisabledMessage =
  "Commerce is reserved in MVP and disabled by default.";

export function throwCommerceDisabled(input: {
  action?: CommerceDisabledAction;
  message?: string;
  requestId: string;
  resource?: CommerceDisabledResource;
}): never {
  throw new ConflictException({
    code: apiErrorCodes.COMMERCE_DISABLED,
    details: createCommerceDisabledDetails({
      action: input.action ?? "update",
      resource: input.resource ?? "product",
    }),
    message: input.message ?? defaultCommerceDisabledMessage,
    requestId: input.requestId,
  });
}
