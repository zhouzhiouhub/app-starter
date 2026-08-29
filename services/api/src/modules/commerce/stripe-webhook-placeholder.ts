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
  readyForSignatureVerification: boolean;
  rawBodyBytes: number;
  rawBodyCaptured: boolean;
  signatureHasTimestamp: boolean;
  signatureHasV1: boolean;
  signatureProvided: boolean;
  signatureTimestampReady: boolean;
  signatureV1Ready: boolean;
}

export function readStripeWebhookPlaceholderContract({
  request,
  stripeSignature,
}: StripeWebhookPlaceholderInput): StripeWebhookPlaceholderContract {
  const rawBody = readCapturedRawBody(request);
  const signature = stripeSignature?.trim() ?? "";
  const signatureTimestampReady = hasNumericSignaturePart(signature, "t");
  const signatureV1Ready = hasNonEmptySignaturePart(signature, "v1");
  const rawBodyReady = rawBody !== null && rawBody.byteLength > 0;

  return {
    readyForSignatureVerification:
      rawBodyReady && signatureTimestampReady && signatureV1Ready,
    rawBodyBytes: rawBody?.byteLength ?? 0,
    rawBodyCaptured: rawBody !== null,
    signatureHasTimestamp: hasSignaturePart(signature, "t"),
    signatureHasV1: hasSignaturePart(signature, "v1"),
    signatureProvided: signature.length > 0,
    signatureTimestampReady,
    signatureV1Ready,
  };
}

export function throwStripeWebhookReserved(
  input: StripeWebhookPlaceholderInput,
): never {
  const webhookVerification = readStripeWebhookPlaceholderContract(input);

  return throwCommerceDisabled({
    action: "receive-webhook",
    message: stripeWebhookDisabledMessage,
    requestId: input.requestId,
    resource: "stripe-webhook",
    webhookVerification,
  });
}

function hasSignaturePart(signature: string, key: string) {
  return readSignaturePartValues(signature, key).length > 0;
}

function hasNonEmptySignaturePart(signature: string, key: string) {
  return readSignaturePartValues(signature, key).some(
    (value) => value.length > 0,
  );
}

function hasNumericSignaturePart(signature: string, key: string) {
  return readSignaturePartValues(signature, key).some((value) =>
    /^\d+$/.test(value),
  );
}

function readSignaturePartValues(signature: string, key: string) {
  return signature
    .split(",")
    .map((part) => part.trim())
    .flatMap((part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return [];
      }

      const partKey = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      return partKey === key ? [value] : [];
    });
}
