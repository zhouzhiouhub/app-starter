import {
  createCommerceDisabledDetails as createSharedCommerceDisabledDetails,
  type CommerceDisabledAction,
  type CommerceDisabledResource,
} from "@app-starter/schema";
import { readApiFeatureFlags } from "../../common/feature-flags.js";

export type { CommerceDisabledAction, CommerceDisabledResource };

export function createCommerceDisabledDetails(input: {
  action: CommerceDisabledAction;
  resource: CommerceDisabledResource;
}) {
  return createSharedCommerceDisabledDetails({
    action: input.action,
    commerceEnabled: readApiFeatureFlags().commerceEnabled,
    resource: input.resource,
  });
}
