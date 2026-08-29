import {
  createCommerceDisabledDetails as createSharedCommerceDisabledDetails,
  type CommerceDisabledAction,
  type CommerceDisabledResource,
  type CommerceDisabledWebhookVerificationInput,
} from "@app-starter/schema";
import { readApiFeatureFlags } from "../../common/feature-flags.js";

export type {
  CommerceDisabledAction,
  CommerceDisabledResource,
  CommerceDisabledWebhookVerificationInput,
};

export function createCommerceDisabledDetails(input: {
  action: CommerceDisabledAction;
  resource: CommerceDisabledResource;
  webhookVerification?: CommerceDisabledWebhookVerificationInput;
}) {
  return createSharedCommerceDisabledDetails({
    action: input.action,
    commerceEnabled: readApiFeatureFlags().commerceEnabled,
    resource: input.resource,
    webhookVerification: input.webhookVerification,
  });
}
