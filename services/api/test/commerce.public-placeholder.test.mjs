import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import {
  createRouteRawBodyCapture,
  stripeWebhookRawBodyRoutePath,
} from "../dist/common/raw-body.js";
import { configureApiApplication } from "../dist/common/api-application.js";
import { PublicCommerceController } from "../dist/modules/commerce/public-commerce.controller.js";
import { StripeWebhookController } from "../dist/modules/commerce/stripe-webhook.controller.js";
import { readStripeWebhookPlaceholderContract } from "../dist/modules/commerce/stripe-webhook-placeholder.js";
import {
  assertApiBadRequest,
  assertApiConflict,
} from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

class PublicCommerceRouteTestModule {}

Module({
  controllers: [PublicCommerceController, StripeWebhookController],
})(PublicCommerceRouteTestModule);

const validCartIdempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
const validCheckoutIdempotencyKey = "4d3a1fc5-3d10-4bb8-91ef-c8a8fef3c61a";

test("commerce endpoints reject writes while commerce is disabled", () => {
  for (const flag of ["false", "true"]) {
    withEnv({ COMMERCE_ENABLED: flag }, () => {
      const controller = new PublicCommerceController();

      const cartError = assertApiConflict(
        () =>
          controller.addToCart(
            validCartIdempotencyKey,
            "request-cart-disabled",
          ),
        apiErrorCodes.COMMERCE_DISABLED,
      );
      const checkoutError = assertApiConflict(
        () =>
          controller.checkout(
            validCheckoutIdempotencyKey,
            "request-checkout-disabled",
          ),
        apiErrorCodes.COMMERCE_DISABLED,
      );

      assert.equal(cartError.getResponse()?.requestId, "request-cart-disabled");
      assert.deepEqual(cartError.getResponse()?.details, {
        action: "add-to-cart",
        commerceEnabled: flag === "true",
        reservedPhase: "phase-2",
        resource: "cart",
        writable: false,
        writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
      });
      assert.equal(
        checkoutError.getResponse()?.requestId,
        "request-checkout-disabled",
      );
      assert.deepEqual(checkoutError.getResponse()?.details, {
        action: "checkout",
        commerceEnabled: flag === "true",
        reservedPhase: "phase-2",
        resource: "checkout",
        writable: false,
        writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
      });
    });
  }
});

test("public cart and checkout require idempotency keys before disabled writes", () => {
  const controller = new PublicCommerceController();

  const cartError = assertApiBadRequest(
    () => controller.addToCart(undefined, "request-cart-missing-key"),
    apiErrorCodes.VALIDATION_ERROR,
  );
  const checkoutError = assertApiBadRequest(
    () => controller.checkout("retry-me", "request-checkout-invalid-key"),
    apiErrorCodes.VALIDATION_ERROR,
  );

  assert.equal(
    cartError.getResponse()?.message,
    "Idempotency-Key header must be a UUID.",
  );
  assert.equal(
    checkoutError.getResponse()?.message,
    "Idempotency-Key header must be a UUID.",
  );
  assert.equal(cartError.getResponse()?.details, undefined);
  assert.equal(checkoutError.getResponse()?.details, undefined);
});

test("stripe webhook placeholder rejects events without echoing payloads", () => {
  for (const flag of ["false", "true"]) {
    withEnv({ COMMERCE_ENABLED: flag }, () => {
      const controller = new StripeWebhookController();

      const error = assertApiConflict(
        () => controller.receiveStripeWebhook("request-webhook-disabled"),
        apiErrorCodes.COMMERCE_DISABLED,
      );
      const response = error.getResponse();
      const serialized = JSON.stringify(response);

      assert.equal(response?.requestId, "request-webhook-disabled");
      assert.deepEqual(response?.details, {
        action: "receive-webhook",
        commerceEnabled: flag === "true",
        reservedPhase: "phase-2",
        resource: "stripe-webhook",
        webhookVerification: {
          eventProcessed: false,
          rawBodyBytes: 0,
          rawBodyCaptured: false,
          readyForSignatureVerification: false,
          signatureHasTimestamp: false,
          signatureHasV1: false,
          signatureProvided: false,
          signatureTimestampReady: false,
          signatureV1Ready: false,
          signatureVerified: false,
          webhookEventPersisted: false,
        },
        writable: false,
        writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
      });
      assert.match(response?.message, /Stripe webhook is reserved/);
      assert.equal(serialized.includes("evt_secret"), false);
      assert.equal(serialized.includes("stripe-signature"), false);
    });
  }
});

test("stripe webhook placeholder records raw body and signature shape only", () => {
  const capture = createRouteRawBodyCapture(stripeWebhookRawBodyRoutePath);
  const request = {
    method: "POST",
    originalUrl: "/api/v1/webhooks/stripe",
  };
  const payload = Buffer.from('{"id":"evt_secret_payload"}');

  capture(request, {}, payload);

  const contract = readStripeWebhookPlaceholderContract({
    request,
    requestId: "request-webhook-contract",
    stripeSignature: "t=1,v1=secret_signature",
  });
  const serialized = JSON.stringify(contract);

  assert.deepEqual(contract, {
    readyForSignatureVerification: true,
    rawBodyBytes: payload.byteLength,
    rawBodyCaptured: true,
    signatureHasTimestamp: true,
    signatureHasV1: true,
    signatureProvided: true,
    signatureTimestampReady: true,
    signatureV1Ready: true,
  });
  assert.equal(serialized.includes("evt_secret_payload"), false);
  assert.equal(serialized.includes("secret_signature"), false);
});

test("stripe webhook placeholder separates signature shape from verification readiness", () => {
  const capture = createRouteRawBodyCapture(stripeWebhookRawBodyRoutePath);
  const request = {
    method: "POST",
    originalUrl: "/api/v1/webhooks/stripe",
  };

  capture(request, {}, Buffer.from('{"id":"evt_shape_only"}'));

  assert.deepEqual(
    readStripeWebhookPlaceholderContract({
      request,
      requestId: "request-webhook-empty-signature",
      stripeSignature: "t=,v1=",
    }),
    {
      readyForSignatureVerification: false,
      rawBodyBytes: 23,
      rawBodyCaptured: true,
      signatureHasTimestamp: true,
      signatureHasV1: true,
      signatureProvided: true,
      signatureTimestampReady: false,
      signatureV1Ready: false,
    },
  );

  assert.deepEqual(
    readStripeWebhookPlaceholderContract({
      requestId: "request-webhook-missing-raw-body",
      stripeSignature: "t=1,v1=secret_signature",
    }),
    {
      readyForSignatureVerification: false,
      rawBodyBytes: 0,
      rawBodyCaptured: false,
      signatureHasTimestamp: true,
      signatureHasV1: true,
      signatureProvided: true,
      signatureTimestampReady: true,
      signatureV1Ready: true,
    },
  );
});

test("public product detail stays an explicit MVP placeholder", async () => {
  const app = await createPublicCommerceApp();

  try {
    const response = await fetch(
      `${readPublicCommerceBaseUrl(app)}/public/products/product-secret-token`,
      {
        headers: {
          "x-request-id": "request-public-product-placeholder",
        },
      },
    );
    const text = await response.text();
    const body = JSON.parse(text);
    const error = readApiErrorBody(body);

    assert.equal(response.status, 404);
    assert.equal(error.code, apiErrorCodes.NOT_FOUND);
    assert.equal(error.requestId, "request-public-product-placeholder");
    assert.deepEqual(error.details, {
      action: "read",
      available: false,
      commerceEnabled: false,
      readUnavailableCode: apiErrorCodes.NOT_FOUND,
      reservedPhase: "phase-2",
      resource: "product",
      surface: "public",
      writable: false,
    });
    assert.equal(text.includes("product-secret-token"), false);
  } finally {
    await app.close();
  }
});

test("public commerce disabled routes keep the MVP public paths", async () => {
  const app = await createPublicCommerceApp();

  try {
    const baseUrl = readPublicCommerceBaseUrl(app);

    for (const path of ["cart", "checkout"]) {
      const response = await fetch(`${baseUrl}/public/${path}`, {
        headers: {
          "Idempotency-Key":
            path === "cart"
              ? validCartIdempotencyKey
              : validCheckoutIdempotencyKey,
          "x-request-id": `request-commerce-${path}`,
        },
        method: "POST",
      });
      const body = await response.json();
      const error = readApiErrorBody(body);

      assert.equal(response.status, 409);
      assert.equal(error.code, apiErrorCodes.COMMERCE_DISABLED);
      assert.equal(error.requestId, `request-commerce-${path}`);
      assert.equal(error.details.resource, path);
      assert.equal(error.details.writable, false);
    }

    const webhookResponse = await fetch(`${baseUrl}/webhooks/stripe`, {
      body: JSON.stringify({
        id: "evt_secret_payload",
        object: "event",
      }),
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=secret_signature",
        "x-request-id": "request-commerce-webhook",
      },
      method: "POST",
    });
    const webhookText = await webhookResponse.text();
    const webhookBody = JSON.parse(webhookText);
    const webhookError = readApiErrorBody(webhookBody);

    assert.equal(webhookResponse.status, 409);
    assert.equal(webhookError.code, apiErrorCodes.COMMERCE_DISABLED);
    assert.equal(webhookError.requestId, "request-commerce-webhook");
    assert.equal(webhookError.details.resource, "stripe-webhook");
    assert.equal(webhookError.details.action, "receive-webhook");
    assert.deepEqual(webhookError.details.webhookVerification, {
      eventProcessed: false,
      rawBodyBytes: 44,
      rawBodyCaptured: true,
      readyForSignatureVerification: true,
      signatureHasTimestamp: true,
      signatureHasV1: true,
      signatureProvided: true,
      signatureTimestampReady: true,
      signatureV1Ready: true,
      signatureVerified: false,
      webhookEventPersisted: false,
    });
    assert.equal(webhookText.includes("evt_secret_payload"), false);
    assert.equal(webhookText.includes("secret_signature"), false);
  } finally {
    await app.close();
  }
});

test("public commerce write routes reject missing idempotency keys", async () => {
  const app = await createPublicCommerceApp();

  try {
    const response = await fetch(
      `${readPublicCommerceBaseUrl(app)}/public/cart`,
      {
        body: JSON.stringify({ productId: "product-secret-token" }),
        headers: {
          "content-type": "application/json",
          "x-request-id": "request-cart-missing-key",
        },
        method: "POST",
      },
    );
    const text = await response.text();
    const body = JSON.parse(text);
    const error = readApiErrorBody(body);

    assert.equal(response.status, 400);
    assert.equal(error.code, apiErrorCodes.VALIDATION_ERROR);
    assert.equal(error.message, "Idempotency-Key header must be a UUID.");
    assert.equal(error.requestId, "request-cart-missing-key");
    assert.equal(error.details, undefined);
    assert.equal(text.includes("product-secret-token"), false);
  } finally {
    await app.close();
  }
});

async function createPublicCommerceApp() {
  const app = await NestFactory.create(PublicCommerceRouteTestModule, {
    bodyParser: false,
    logger: false,
  });
  configureApiApplication(app);
  await app.listen(0, "127.0.0.1");

  return app;
}

function readPublicCommerceBaseUrl(app) {
  const address = app.getHttpServer().address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  return `http://127.0.0.1:${port}/api/v1`;
}

function readApiErrorBody(body) {
  return body.error ?? body;
}
