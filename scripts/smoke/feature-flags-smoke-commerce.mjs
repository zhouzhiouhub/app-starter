import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { assertErrorResponse } from "./feature-flags-smoke-disabled-endpoint.mjs";

export async function assertCommerceReadPlaceholders(input, accessToken) {
  await assertEmptyListResponse(
    `${input.apiBaseUrl}/products`,
    accessToken,
    "Products placeholder",
    "products",
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

export async function assertCommerceDisabled(input) {
  await assertErrorResponse(
    `${input.apiBaseUrl}/public/cart`,
    {
      body: JSON.stringify({ sku: "smoke-sku", quantity: 1 }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    "COMMERCE_DISABLED",
  );
  await assertErrorResponse(
    `${input.apiBaseUrl}/public/checkout`,
    {
      body: JSON.stringify({ cartId: "smoke-cart" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
    "COMMERCE_DISABLED",
  );
  await assertErrorResponse(
    `${input.apiBaseUrl}/webhooks/stripe`,
    {
      body: JSON.stringify({ id: "evt_smoke_webhook", object: "event" }),
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": "t=1,v1=smoke-signature",
      },
      method: "POST",
    },
    "COMMERCE_DISABLED",
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
