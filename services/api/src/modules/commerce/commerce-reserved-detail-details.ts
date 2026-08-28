import {
  createCommerceReservedDetailDetails as createSharedCommerceReservedDetailDetails,
  type CommerceReservedDetailResource,
  type CommerceReservedDetailSurface,
} from "@app-starter/schema";
import { readApiFeatureFlags } from "../../common/feature-flags.js";

export type { CommerceReservedDetailResource, CommerceReservedDetailSurface };

export function createCommerceReservedDetailDetails(input: {
  resource: CommerceReservedDetailResource;
  surface: CommerceReservedDetailSurface;
}) {
  return createSharedCommerceReservedDetailDetails({
    commerceEnabled: readApiFeatureFlags().commerceEnabled,
    resource: input.resource,
    surface: input.surface,
  });
}
