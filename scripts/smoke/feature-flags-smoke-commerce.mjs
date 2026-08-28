import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import {
  assertCommerceDisabledErrorResponse,
  assertCommerceReservedDetailResponse,
} from "./feature-flags-smoke-commerce-errors.mjs";

export async function assertCommerceReadPlaceholders(input, accessToken) {
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/products`,
    accessToken,
    "Products placeholder",
    "products",
  );
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/products/${smokeProductId}/variants`,
    accessToken,
    "Product variants placeholder",
    "variants",
  );
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/products/${smokeProductId}/prices`,
    accessToken,
    "Product prices placeholder",
    "prices",
  );
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/products/${smokeProductId}/inventory`,
    accessToken,
    "Product inventory placeholder",
    "inventory",
  );
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/orders`,
    accessToken,
    "Orders placeholder",
    "orders",
  );
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/payments`,
    accessToken,
    "Payments placeholder",
    "payments",
  );
}

const smokeProductId = "smoke-product";
const smokeOrderId = "smoke-order";
const smokePaymentId = "smoke-payment";
const smokeProductCreateIdempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
const smokeProductUpdateIdempotencyKey = "4d3a1fc5-3d10-4bb8-91ef-c8a8fef3c61a";

export async function assertCommerceDisabled(input, accessToken) {
  await assertCommerceReservedDetailResponse(
    `${input.apiBaseUrl}/products/${smokeProductId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    },
    {
      resource: "product",
      surface: "admin",
    },
    smokeProductId,
  );
  await assertCommerceDisabledErrorResponse(
    `${input.apiBaseUrl}/products`,
    {
      body: JSON.stringify({ name: "Smoke Product", slug: smokeProductId }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": smokeProductCreateIdempotencyKey,
      },
      method: "POST",
    },
    {
      action: "create",
      resource: "product",
    },
  );
  await assertCommerceDisabledErrorResponse(
    `${input.apiBaseUrl}/products/${smokeProductId}`,
    {
      body: JSON.stringify({ name: "Smoke Product Updated" }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": smokeProductUpdateIdempotencyKey,
      },
      method: "PATCH",
    },
    {
      action: "update",
      resource: "product",
    },
  );
  await assertCommerceReservedDetailResponse(
    `${input.apiBaseUrl}/orders/${smokeOrderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    },
    {
      resource: "order",
      surface: "admin",
    },
    smokeOrderId,
  );
  await assertCommerceReservedDetailResponse(
    `${input.apiBaseUrl}/payments/${smokePaymentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    },
    {
      resource: "payment",
      surface: "admin",
    },
    smokePaymentId,
  );
  await assertCommerceReservedDetailResponse(
    `${input.apiBaseUrl}/public/products/smoke-product`,
    {
      method: "GET",
    },
    {
      resource: "product",
      surface: "public",
    },
    smokeProductId,
  );
  await assertCommerceDisabledErrorResponse(
    `${input.apiBaseUrl}/public/cart`,
    {
      body: JSON.stringify({ sku: "smoke-sku", quantity: 1 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    {
      action: "add-to-cart",
      resource: "cart",
    },
  );
  await assertCommerceDisabledErrorResponse(
    `${input.apiBaseUrl}/public/checkout`,
    {
      body: JSON.stringify({ cartId: "smoke-cart" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    {
      action: "checkout",
      resource: "checkout",
    },
  );
  await assertCommerceDisabledErrorResponse(
    `${input.apiBaseUrl}/webhooks/stripe`,
    {
      body: JSON.stringify({ id: "evt_smoke_webhook", object: "event" }),
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "t=1,v1=smoke-signature",
      },
      method: "POST",
    },
    {
      action: "receive-webhook",
      resource: "stripe-webhook",
    },
  );
}

async function assertEmptyListResponse(url, accessToken, label, resource) {
  const response = await fetchJson(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, `${label} failed.`));
  }

  if (!Array.isArray(response.body?.data) || response.body.data.length !== 0) {
    throw new Error(`${label} expected an empty data array.`);
  }

  assertCommercePlaceholderMeta(response.body?.meta, label, resource);
}

function assertCommercePlaceholderMeta(meta, label, resource) {
  if (
    meta?.commerceEnabled !== false ||
    meta?.currency !== "USD" ||
    meta?.market !== "us" ||
    meta?.reservedPhase !== "phase-2" ||
    meta?.resource !== resource ||
    meta?.total !== 0 ||
    meta?.writeDisabledCode !== "COMMERCE_DISABLED" ||
    meta?.writable !== false
  ) {
    throw new Error(`${label} did not expose disabled Commerce metadata.`);
  }
}
