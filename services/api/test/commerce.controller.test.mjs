import assert from "node:assert/strict";
import test from "node:test";
import { CommerceController } from "../dist/modules/commerce/commerce.controller.js";

test("commerce read placeholders carry the current request id", () => {
  const controller = new CommerceController();
  const products = controller.getProducts("request-products");
  const orders = controller.getOrders("request-orders");

  assert.deepEqual(products.data, []);
  assert.deepEqual(orders.data, []);
  assert.equal(products.meta.requestId, "request-products");
  assert.equal(orders.meta.requestId, "request-orders");
});
