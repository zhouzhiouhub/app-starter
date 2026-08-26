import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants.js";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";
import { REQUIRE_SCOPES_KEY } from "../dist/common/require-scopes.decorator.js";
import { AdminCommerceController } from "../dist/modules/commerce/admin-commerce.controller.js";
import { TENANT_ADMIN_PERMISSIONS } from "../dist/modules/identity/identity.constants.js";
import {
  assertApiBadRequest,
  assertApiConflict,
} from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

const validIdempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";

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
      const variants = controller.getProductVariants("request-variants");
      const prices = controller.getProductPrices("request-prices");
      const inventory = controller.getProductInventory("request-inventory");
      const orders = controller.getOrders("request-orders");
      const payments = controller.getPayments("request-payments");

      assert.deepEqual(products.data, []);
      assert.deepEqual(variants.data, []);
      assert.deepEqual(prices.data, []);
      assert.deepEqual(inventory.data, []);
      assert.deepEqual(orders.data, []);
      assert.deepEqual(payments.data, []);
      assert.deepEqual(products.meta, readCommercePlaceholderMeta("products"));
      assert.deepEqual(variants.meta, readCommercePlaceholderMeta("variants"));
      assert.deepEqual(prices.meta, readCommercePlaceholderMeta("prices"));
      assert.deepEqual(
        inventory.meta,
        readCommercePlaceholderMeta("inventory"),
      );
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
  const productDetailScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getProduct,
  );
  const productCreateScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.createProduct,
  );
  const productVariantScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getProductVariants,
  );
  const productPriceScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getProductPrices,
  );
  const productInventoryScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getProductInventory,
  );
  const productUpdateScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.updateProduct,
  );
  const orderScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getOrders,
  );
  const orderDetailScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getOrder,
  );
  const paymentScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getPayments,
  );
  const paymentDetailScopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AdminCommerceController.prototype.getPayment,
  );

  assert.deepEqual(guards, [AdminApiGuard]);
  assert.deepEqual(productScopes, ["product:read"]);
  assert.deepEqual(productDetailScopes, ["product:read"]);
  assert.deepEqual(productCreateScopes, ["product:write"]);
  assert.deepEqual(productVariantScopes, ["product:read"]);
  assert.deepEqual(productPriceScopes, ["product:read"]);
  assert.deepEqual(productInventoryScopes, ["product:read"]);
  assert.deepEqual(productUpdateScopes, ["product:write"]);
  assert.deepEqual(orderScopes, ["order:read"]);
  assert.deepEqual(orderDetailScopes, ["order:read"]);
  assert.deepEqual(paymentScopes, ["payment:read"]);
  assert.deepEqual(paymentDetailScopes, ["payment:read"]);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("product:read"), true);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("product:write"), true);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("order:read"), true);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("payment:read"), true);
});

test("commerce admin reserved routes keep explicit HTTP contracts", () => {
  assertRoute(AdminCommerceController.prototype.getProducts, {
    method: RequestMethod.GET,
    path: "products",
  });
  assertRoute(AdminCommerceController.prototype.createProduct, {
    method: RequestMethod.POST,
    path: "products",
  });
  assertRoute(AdminCommerceController.prototype.getProduct, {
    method: RequestMethod.GET,
    path: "products/:id",
  });
  assertRoute(AdminCommerceController.prototype.getProductVariants, {
    method: RequestMethod.GET,
    path: "products/:id/variants",
  });
  assertRoute(AdminCommerceController.prototype.getProductPrices, {
    method: RequestMethod.GET,
    path: "products/:id/prices",
  });
  assertRoute(AdminCommerceController.prototype.getProductInventory, {
    method: RequestMethod.GET,
    path: "products/:id/inventory",
  });
  assertRoute(AdminCommerceController.prototype.updateProduct, {
    method: RequestMethod.PATCH,
    path: "products/:id",
  });
  assertRoute(AdminCommerceController.prototype.getOrders, {
    method: RequestMethod.GET,
    path: "orders",
  });
  assertRoute(AdminCommerceController.prototype.getOrder, {
    method: RequestMethod.GET,
    path: "orders/:id",
  });
  assertRoute(AdminCommerceController.prototype.getPayments, {
    method: RequestMethod.GET,
    path: "payments",
  });
  assertRoute(AdminCommerceController.prototype.getPayment, {
    method: RequestMethod.GET,
    path: "payments/:id",
  });
});

test("admin product reserved routes keep stable MVP errors", () => {
  const controller = new AdminCommerceController();
  const detailError = assertApiNotFound(
    () => controller.getProduct("request-product-detail"),
    apiErrorCodes.NOT_FOUND,
  );
  const createError = assertApiConflict(
    () =>
      controller.createProduct(validIdempotencyKey, "request-product-create"),
    apiErrorCodes.COMMERCE_DISABLED,
  );
  const updateError = assertApiConflict(
    () =>
      controller.updateProduct(validIdempotencyKey, "request-product-update"),
    apiErrorCodes.COMMERCE_DISABLED,
  );
  const missingKeyError = assertApiBadRequest(
    () => controller.createProduct(undefined, "request-product-missing-key"),
    apiErrorCodes.VALIDATION_ERROR,
  );

  assert.equal(detailError.getResponse()?.requestId, "request-product-detail");
  assert.equal(createError.getResponse()?.requestId, "request-product-create");
  assert.equal(updateError.getResponse()?.requestId, "request-product-update");
  assert.equal(missingKeyError.getResponse()?.requestId, undefined);
});

test("admin order and payment detail routes keep stable MVP errors", () => {
  const controller = new AdminCommerceController();
  const orderError = assertApiNotFound(
    () => controller.getOrder("request-order-detail"),
    apiErrorCodes.NOT_FOUND,
  );
  const paymentError = assertApiNotFound(
    () => controller.getPayment("request-payment-detail"),
    apiErrorCodes.NOT_FOUND,
  );
  const serializedOrder = JSON.stringify(orderError.getResponse());
  const serializedPayment = JSON.stringify(paymentError.getResponse());

  assert.equal(orderError.getResponse()?.requestId, "request-order-detail");
  assert.equal(paymentError.getResponse()?.requestId, "request-payment-detail");
  assert.match(orderError.getResponse()?.message, /Order details/);
  assert.match(paymentError.getResponse()?.message, /Payment details/);
  assert.equal(serializedOrder.includes("smoke-order"), false);
  assert.equal(serializedPayment.includes("smoke-payment"), false);
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

function assertApiNotFound(fn, expectedCode) {
  let caught;

  assert.throws(fn, (error) => {
    caught = error;
    return (
      typeof error.getStatus === "function" &&
      error.getStatus() === 404 &&
      error.getResponse()?.code === expectedCode
    );
  });

  return caught;
}

function assertRoute(handler, expected) {
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), expected.path);
  assert.equal(Reflect.getMetadata(METHOD_METADATA, handler), expected.method);
}
