import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Module } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants.js";
import { NestFactory } from "@nestjs/core";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";
import { REQUIRE_SCOPES_KEY } from "../dist/common/require-scopes.decorator.js";
import { AdminCommerceController } from "../dist/modules/commerce/admin-commerce.controller.js";
import { PublicCommerceController } from "../dist/modules/commerce/public-commerce.controller.js";
import { StripeWebhookController } from "../dist/modules/commerce/stripe-webhook.controller.js";
import { TENANT_ADMIN_PERMISSIONS } from "../dist/modules/identity/identity.constants.js";
import { assertApiConflict } from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

class PublicCommerceRouteTestModule {}

Module({
  controllers: [PublicCommerceController, StripeWebhookController],
})(PublicCommerceRouteTestModule);

test("commerce read placeholders carry the current request id", () => {
  withEnv(
    {
      COMMERCE_ENABLED: "false",
      DEFAULT_CURRENCY: "USD",
      DEFAULT_MARKET: "us",
    },
    () => {
      const controller = new AdminCommerceController();
      const products = controller.getProducts("request-products");
      const orders = controller.getOrders("request-orders");
      const payments = controller.getPayments("request-payments");

      assert.deepEqual(products.data, []);
      assert.deepEqual(orders.data, []);
      assert.deepEqual(payments.data, []);
      assert.deepEqual(products.meta, readCommercePlaceholderMeta("products"));
      assert.deepEqual(orders.meta, readCommercePlaceholderMeta("orders"));
      assert.deepEqual(payments.meta, readCommercePlaceholderMeta("payments"));
    },
  );
});

test("commerce read placeholders expose normalized reserved state", () => {
  withEnv(
    {
      COMMERCE_ENABLED: " TRUE ",
      DEFAULT_CURRENCY: " EUR ",
      DEFAULT_MARKET: " eu ",
    },
    () => {
      const controller = new AdminCommerceController();
      const response = controller.getProducts("request-products-phase-2");

      assert.equal(response.meta.commerceEnabled, true);
      assert.equal(response.meta.currency, "EUR");
      assert.equal(response.meta.market, "eu");
      assert.equal(response.meta.requestId, "request-products-phase-2");
      assert.equal(
        response.meta.writeDisabledCode,
        apiErrorCodes.COMMERCE_DISABLED,
      );
      assert.equal(response.meta.writable, false);
    },
  );
});

test("commerce read placeholders require admin guard and read scopes", () => {
  const guards = Reflect.getMetadata(GUARDS_METADATA, AdminCommerceController);
  const productScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getProducts,
  );
  const orderScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getOrders,
  );
  const paymentScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getPayments,
  );

  assert.deepEqual(guards, [AdminApiGuard]);
  assert.deepEqual(productScopes, ["product:read"]);
  assert.deepEqual(orderScopes, ["order:read"]);
  assert.deepEqual(paymentScopes, ["payment:read"]);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("product:read"), true);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("order:read"), true);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("payment:read"), true);
});

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
      assert.equal(
        checkoutError.getResponse()?.requestId,
        "request-checkout-disabled",
      );
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
      assert.match(response?.message, /Stripe webhook is reserved/);
      assert.equal(serialized.includes("evt_secret"), false);
      assert.equal(serialized.includes("stripe-signature"), false);
    });
  }
});

test("public commerce disabled routes keep the MVP public paths", async () => {
  const app = await NestFactory.create(PublicCommerceRouteTestModule, {
    logger: false,
  });
  app.setGlobalPrefix("api/v1");
  await app.listen(0, "127.0.0.1");

  const address = app.getHttpServer().address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  try {
    for (const path of ["cart", "checkout"]) {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/public/${path}`,
        {
          headers: {
            "x-request-id": `request-commerce-${path}`,
          },
          method: "POST",
        },
      );
      const body = await response.json();

      assert.equal(response.status, 409);
      assert.equal(body.code, apiErrorCodes.COMMERCE_DISABLED);
      assert.equal(body.requestId, `request-commerce-${path}`);
    }

    const webhookResponse = await fetch(
      `http://127.0.0.1:${port}/api/v1/webhooks/stripe`,
      {
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
      },
    );
    const webhookText = await webhookResponse.text();
    const webhookBody = JSON.parse(webhookText);

    assert.equal(webhookResponse.status, 409);
    assert.equal(webhookBody.code, apiErrorCodes.COMMERCE_DISABLED);
    assert.equal(webhookBody.requestId, "request-commerce-webhook");
    assert.equal(webhookText.includes("evt_secret_payload"), false);
    assert.equal(webhookText.includes("secret_signature"), false);
  } finally {
    await app.close();
  }
});

function readCommercePlaceholderMeta(resource) {
  return {
    commerceEnabled: false,
    currency: "USD",
    market: "us",
    requestId: `request-${resource}`,
    reservedPhase: "phase-2",
    resource,
    total: 0,
    writeDisabledCode: apiErrorCodes.COMMERCE_DISABLED,
    writable: false,
  };
}
