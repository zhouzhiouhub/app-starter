import { apiErrorCodes } from "./api-contract.js";

export const commerceReservedDetailAvailable = false as const;
export const commerceReservedDetailPhase = "phase-2" as const;
export const commerceReservedDetailWritable = false as const;

export type CommerceReservedDetailAction = "read";
export type CommerceReservedDetailResource = "order" | "payment" | "product";
export type CommerceReservedDetailSurface = "admin" | "public";

export interface CommerceReservedDetailDetails {
  action: CommerceReservedDetailAction;
  available: typeof commerceReservedDetailAvailable;
  commerceEnabled: boolean;
  readUnavailableCode: typeof apiErrorCodes.NOT_FOUND;
  reservedPhase: typeof commerceReservedDetailPhase;
  resource: CommerceReservedDetailResource;
  surface: CommerceReservedDetailSurface;
  writable: typeof commerceReservedDetailWritable;
}

export function createCommerceReservedDetailDetails(input: {
  commerceEnabled: boolean;
  resource: CommerceReservedDetailResource;
  surface: CommerceReservedDetailSurface;
}): CommerceReservedDetailDetails {
  return {
    action: "read",
    available: commerceReservedDetailAvailable,
    commerceEnabled: input.commerceEnabled,
    readUnavailableCode: apiErrorCodes.NOT_FOUND,
    reservedPhase: commerceReservedDetailPhase,
    resource: input.resource,
    surface: input.surface,
    writable: commerceReservedDetailWritable,
  };
}
