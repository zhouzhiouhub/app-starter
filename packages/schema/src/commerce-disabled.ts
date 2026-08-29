import { apiErrorCodes } from "./api-contract.js";

export const commerceDisabledReservedPhase = "phase-2" as const;
export const commerceDisabledWritable = false as const;
export const commerceDisabledWebhookEventProcessed = false as const;
export const commerceDisabledWebhookEventPersisted = false as const;
export const commerceDisabledWebhookSignatureVerified = false as const;

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
  webhookVerification?: CommerceDisabledWebhookVerificationDetails;
  writeDisabledCode: typeof apiErrorCodes.COMMERCE_DISABLED;
}

export interface CommerceDisabledWebhookVerificationInput {
  rawBodyBytes: number;
  rawBodyCaptured: boolean;
  readyForSignatureVerification: boolean;
  signatureHasTimestamp: boolean;
  signatureHasV1: boolean;
  signatureProvided: boolean;
  signatureTimestampReady: boolean;
  signatureV1Ready: boolean;
}

export interface CommerceDisabledWebhookVerificationDetails
  extends CommerceDisabledWebhookVerificationInput {
  eventProcessed: typeof commerceDisabledWebhookEventProcessed;
  signatureVerified: typeof commerceDisabledWebhookSignatureVerified;
  webhookEventPersisted: typeof commerceDisabledWebhookEventPersisted;
}

export function createCommerceDisabledDetails(input: {
  action: CommerceDisabledAction;
  commerceEnabled: boolean;
  resource: CommerceDisabledResource;
  webhookVerification?: CommerceDisabledWebhookVerificationInput;
}): CommerceDisabledDetails {
  const details: CommerceDisabledDetails = {
    action: input.action,
    commerceEnabled: input.commerceEnabled,
    reservedPhase: commerceDisabledReservedPhase,
    resource: input.resource,
    writable: commerceDisabledWritable,
    writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
  };

  if (input.webhookVerification) {
    details.webhookVerification = createCommerceDisabledWebhookVerificationDetails(
      input.webhookVerification,
    );
  }

  return details;
}

export function createCommerceDisabledWebhookVerificationDetails(
  input: CommerceDisabledWebhookVerificationInput,
): CommerceDisabledWebhookVerificationDetails {
  return {
    eventProcessed: commerceDisabledWebhookEventProcessed,
    rawBodyBytes: input.rawBodyBytes,
    rawBodyCaptured: input.rawBodyCaptured,
    readyForSignatureVerification: input.readyForSignatureVerification,
    signatureHasTimestamp: input.signatureHasTimestamp,
    signatureHasV1: input.signatureHasV1,
    signatureProvided: input.signatureProvided,
    signatureTimestampReady: input.signatureTimestampReady,
    signatureV1Ready: input.signatureV1Ready,
    signatureVerified: commerceDisabledWebhookSignatureVerified,
    webhookEventPersisted: commerceDisabledWebhookEventPersisted,
  };
}
