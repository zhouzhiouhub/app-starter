import { apiErrorCodes } from "./api-contract.js";

export const commerceDisabledReservedPhase = "phase-2" as const;
export const commerceDisabledWritable = false as const;

export type CommerceDisabledAction =
  | "add-to-cart"
  | "checkout"
  | "create"
  | "receive-webhook"
  | "update";

export type CommerceDisabledResource =
  | "cart"
  | "checkout"
  | "product"
  | "stripe-webhook";

export interface CommerceDisabledDetails {
  action: CommerceDisabledAction;
  commerceEnabled: boolean;
  reservedPhase: typeof commerceDisabledReservedPhase;
  resource: CommerceDisabledResource;
  writable: typeof commerceDisabledWritable;
  writeDisabledCode: typeof apiErrorCodes.COMMERCE_DISABLED;
}

export function createCommerceDisabledDetails(input: {
  action: CommerceDisabledAction;
  commerceEnabled: boolean;
  resource: CommerceDisabledResource;
}): CommerceDisabledDetails {
  return {
    action: input.action,
    commerceEnabled: input.commerceEnabled,
    reservedPhase: commerceDisabledReservedPhase,
    resource: input.resource,
    writable: commerceDisabledWritable,
    writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
  };
}
