import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { CommerceController } from "../dist/modules/commerce/commerce.controller.js";
import { assertApiConflict } from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

test("commerce read placeholders carry the current request id", () => {
  const controller = new CommerceController();
  const products = controller.getProducts("request-products");
  const orders = controller.getOrders("request-orders");

  assert.deepEqual(products.data, []);
  assert.deepEqual(orders.data, []);
  assert.equal(products.meta.requestId, "request-products");
  assert.equal(orders.meta.requestId, "request-orders");
});

test("commerce endpoints reject writes while commerce is disabled", () => {
  withEnv({ COMMERCE_ENABLED: "false" }, () => {
    const controller = new CommerceController();

    assertApiConflict(
      () => controller.addToCart(),
      apiErrorCodes.COMMERCE_DISABLED,
    );
    assertApiConflict(
      () => controller.checkout(),
      apiErrorCodes.COMMERCE_DISABLED,
    );
  });
});
