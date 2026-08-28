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
import { PublicCommerceController } from "../dist/modules/commerce/public-commerce.controller.js";
import { StripeWebhookController } from "../dist/modules/commerce/stripe-webhook.controller.js";
import { readStripeWebhookPlaceholderContract } from "../dist/modules/commerce/stripe-webhook-placeholder.js";
import { assertApiConflict } from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

class PublicCommerceRouteTestModule {}

Module({
  controllers: [PublicCommerceController, StripeWebhookController],
})(PublicCommerceRouteTestModule);

test("commerce endpoints reject writes while commerce is disabled", () => {
  for (const flag of ["false", "true"]) {
    withEnv({ COMMERCE_ENABLED: flag }, () => {
      const controller = new PublicCommerceController();

      const cartError = assertApiConflict(
        () => controller.addToCart("request-cart-disabled"),
        apiErrorCodes.COMMERCE_DISABLED,
      );
      const checkoutError = assertApiConflict(
        () => controller.checkout("request-checkout-disabled"),
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

    assert.equal(response.status, 404);
    assert.equal(body.code, apiErrorCodes.NOT_FOUND);
    assert.equal(body.requestId, "request-public-product-placeholder");
    assert.deepEqual(body.details, {
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
          "x-request-id": `request-commerce-${path}`,
        },
        method: "POST",
      });
      const body = await response.json();

      assert.equal(response.status, 409);
      assert.equal(body.code, apiErrorCodes.COMMERCE_DISABLED);
      assert.equal(body.requestId, `request-commerce-${path}`);
      assert.equal(body.details.resource, path);
      assert.equal(body.details.writable, false);
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

    assert.equal(webhookResponse.status, 409);
    assert.equal(webhookBody.code, apiErrorCodes.COMMERCE_DISABLED);
    assert.equal(webhookBody.requestId, "request-commerce-webhook");
    assert.equal(webhookBody.details.resource, "stripe-webhook");
    assert.equal(webhookBody.details.action, "receive-webhook");
    assert.equal(webhookText.includes("evt_secret_payload"), false);
    assert.equal(webhookText.includes("secret_signature"), false);
  } finally {
    await app.close();
  }
});

async function createPublicCommerceApp() {
  const app = await NestFactory.create(PublicCommerceRouteTestModule, {
    logger: false,
  });
  app.setGlobalPrefix("api/v1");
  await app.listen(0, "127.0.0.1");

  return app;
}

function readPublicCommerceBaseUrl(app) {
  const address = app.getHttpServer().address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  return `http://127.0.0.1:${port}/api/v1`;
}
