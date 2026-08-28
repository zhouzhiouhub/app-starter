import type { RawBodyCaptureRequest } from "../../common/raw-body.js";
import { readCapturedRawBody } from "../../common/raw-body.js";
import { throwCommerceDisabled } from "./commerce-disabled.js";

const stripeWebhookDisabledMessage =
  "Stripe webhook is reserved in MVP and disabled by default.";

export interface StripeWebhookPlaceholderInput {
  request?: RawBodyCaptureRequest;
  requestId: string;
  stripeSignature?: string;
}

export interface StripeWebhookPlaceholderContract {
  rawBodyBytes: number;
  rawBodyCaptured: boolean;
  signatureHasTimestamp: boolean;
  signatureHasV1: boolean;
  signatureProvided: boolean;
}

export function readStripeWebhookPlaceholderContract({
  request,
  stripeSignature,
}: StripeWebhookPlaceholderInput): StripeWebhookPlaceholderContract {
  const rawBody = readCapturedRawBody(request);
  const signature = stripeSignature?.trim() ?? "";

  return {
    rawBodyBytes: rawBody?.byteLength ?? 0,
    rawBodyCaptured: rawBody !== null,
    signatureHasTimestamp: hasSignaturePart(signature, "t"),
    signatureHasV1: hasSignaturePart(signature, "v1"),
    signatureProvided: signature.length > 0,
  };
}

export function throwStripeWebhookReserved(
  input: StripeWebhookPlaceholderInput,
): never {
  readStripeWebhookPlaceholderContract(input);

  return throwCommerceDisabled({
    action: "receive-webhook",
    message: stripeWebhookDisabledMessage,
    requestId: input.requestId,
    resource: "stripe-webhook",
  });
}

function hasSignaturePart(signature: string, key: string) {
  return signature.split(",").some((part) => part.trim().startsWith(`${key}=`));
}
