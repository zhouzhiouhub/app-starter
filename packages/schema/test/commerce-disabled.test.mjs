import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  commerceDisabledWebhookEventPersisted,
  commerceDisabledWebhookEventProcessed,
  commerceDisabledWebhookSignatureVerified,
  commerceDisabledReservedPhase,
  commerceDisabledWritable,
  commerceReservedDetailAvailable,
  commerceReservedDetailPhase,
  commerceReservedDetailWritable,
  createCommerceDisabledDetails,
  createCommerceReservedDetailDetails,
} from "../dist/index.js";

test("commerce disabled details expose a stable safe contract", () => {
  assert.deepEqual(
    createCommerceDisabledDetails({
      action: "checkout",
      commerceEnabled: false,
      resource: "checkout",
    }),
    {
      action: "checkout",
      commerceEnabled: false,
      reservedPhase: commerceDisabledReservedPhase,
      resource: "checkout",
      writable: commerceDisabledWritable,
      writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
    },
  );
});

test("commerce disabled details expose safe webhook verification readiness", () => {
  assert.deepEqual(
    createCommerceDisabledDetails({
      action: "receive-webhook",
      commerceEnabled: false,
      resource: "stripe-webhook",
      webhookVerification: {
        rawBodyBytes: 27,
        rawBodyCaptured: true,
        readyForSignatureVerification: true,
        signatureHasTimestamp: true,
        signatureHasV1: true,
        signatureProvided: true,
        signatureTimestampReady: true,
        signatureV1Ready: true,
      },
    }),
    {
      action: "receive-webhook",
      commerceEnabled: false,
      reservedPhase: commerceDisabledReservedPhase,
      resource: "stripe-webhook",
      webhookVerification: {
        eventProcessed: commerceDisabledWebhookEventProcessed,
        rawBodyBytes: 27,
        rawBodyCaptured: true,
        readyForSignatureVerification: true,
        signatureHasTimestamp: true,
        signatureHasV1: true,
        signatureProvided: true,
        signatureTimestampReady: true,
        signatureV1Ready: true,
        signatureVerified: commerceDisabledWebhookSignatureVerified,
        webhookEventPersisted: commerceDisabledWebhookEventPersisted,
      },
      writable: commerceDisabledWritable,
      writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
    },
  );
});

test("commerce reserved detail contract exposes stable safe details", () => {
  assert.deepEqual(
    createCommerceReservedDetailDetails({
      commerceEnabled: false,
      resource: "order",
      surface: "admin",
    }),
    {
      action: "read",
      available: commerceReservedDetailAvailable,
      commerceEnabled: false,
      readUnavailableCode: apiErrorCodes.NOT_FOUND,
      reservedPhase: commerceReservedDetailPhase,
      resource: "order",
      surface: "admin",
      writable: commerceReservedDetailWritable,
    },
  );
});
