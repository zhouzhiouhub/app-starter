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
import { assertApiConflict } from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

class PublicCommerceRouteTestModule {}

Module({
  controllers: [PublicCommerceController],
})(PublicCommerceRouteTestModule);

test("commerce read placeholders carry the current request id", () => {
  const controller = new AdminCommerceController();
  const products = controller.getProducts("request-products");
  const orders = controller.getOrders("request-orders");

  assert.deepEqual(products.data, []);
  assert.deepEqual(orders.data, []);
  assert.equal(products.meta.requestId, "request-products");
  assert.equal(orders.meta.requestId, "request-orders");
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

  assert.deepEqual(guards, [AdminApiGuard]);
  assert.deepEqual(productScopes, ["product:read"]);
  assert.deepEqual(orderScopes, ["order:read"]);
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
  } finally {
    await app.close();
  }
});
