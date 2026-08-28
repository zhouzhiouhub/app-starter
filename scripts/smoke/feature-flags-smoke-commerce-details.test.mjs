import assert from "node:assert/strict";
import test from "node:test";
import { assertFeatureFlagsDisabled } from "./feature-flags-smoke.mjs";
import {
  createFeatureFlagSmokeFetch,
  jsonResponse,
} from "./feature-flags-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("feature flag smoke checks admin order and payment detail placeholders", async () => {
  const calls = [];

  await withFetch(createFeatureFlagSmokeFetch({ calls }), async () => {
    await assertFeatureFlagsDisabled(
      {
        apiBaseUrl: "https://api.example.com/api/v1",
      },
      "access-token",
    );
  });

  assertDetailPlaceholderCall(
    calls.find((call) => call.url.endsWith("/orders/smoke-order")),
  );
  assertDetailPlaceholderCall(
    calls.find((call) => call.url.endsWith("/payments/smoke-payment")),
  );
});

test("feature flag smoke rejects admin order detail placeholder drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/orders/smoke-order": () =>
          jsonResponse({
            data: {
              id: "smoke-order",
            },
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /orders\/smoke-order expected 404 NOT_FOUND/,
      );
    },
  );
});

test("feature flag smoke rejects admin payment detail identifier leaks", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/payments/smoke-payment": () =>
          jsonResponse(
            {
              code: "NOT_FOUND",
              message: "Payment smoke-payment is reserved.",
            },
            { status: 404, statusText: "Not Found" },
          ),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /payments\/smoke-payment leaked the placeholder identifier\./,
      );
    },
  );
});

test("feature flag smoke rejects redirected stripe webhook checks safely", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/webhooks/stripe": () =>
          new Response("", {
            headers: {
              Location:
                "https://api.example.com/login?signature=smoke-signature",
            },
            status: 302,
            statusText: "Found",
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        (error) => {
          assert.match(
            error.message,
            /webhooks\/stripe expected 409 COMMERCE_DISABLED/,
          );
          assert.match(error.message, /302 Found/);
          assert.match(error.message, /redirect:/);
          assert.equal(error.message.includes("smoke-signature"), false);
          return true;
        },
      );
    },
  );
});

test("feature flag smoke rejects non-empty commerce placeholders", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/products": () =>
          jsonResponse({
            data: [{ id: "product-should-not-exist" }],
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /Products placeholder expected an empty data array\./,
      );
    },
  );
});

test("feature flag smoke rejects non-empty product subresource placeholders", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/products/smoke-product/variants": () =>
          jsonResponse({
            data: [{ id: "variant-should-not-exist" }],
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /Product variants placeholder expected an empty data array\./,
      );
    },
  );
});

test("feature flag smoke rejects commerce placeholder metadata drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/orders": () =>
          jsonResponse({
            data: [],
            meta: {
              commerceEnabled: true,
              currency: "USD",
              market: "us",
              reservedPhase: "phase-2",
              resource: "orders",
              total: 0,
              writeDisabledCode: "COMMERCE_DISABLED",
              writable: false,
            },
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /Orders placeholder did not expose disabled Commerce metadata\./,
      );
    },
  );
});

test("feature flag smoke rejects public product placeholder drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/public/products/smoke-product": () =>
          jsonResponse(
            {
              code: "COMMERCE_DISABLED",
              message: "Product page leaked a commerce disabled response.",
            },
            { status: 409, statusText: "Conflict" },
          ),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /public\/products\/smoke-product expected 404 NOT_FOUND/,
      );
    },
  );
});

test("feature flag smoke rejects admin product detail placeholder drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/products/smoke-product": () =>
          jsonResponse({
            data: {
              id: "smoke-product",
              name: "Leaked Product",
            },
          }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /products\/smoke-product expected 404 NOT_FOUND/,
      );
    },
  );
});

test("feature flag smoke rejects admin product write placeholder drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/products": (_url, init) =>
          init.method === "POST"
            ? jsonResponse({
                data: {
                  id: "created-product",
                },
              })
            : jsonResponse({
                data: [],
                meta: {
                  commerceEnabled: false,
                  currency: "USD",
                  market: "us",
                  reservedPhase: "phase-2",
                  resource: "products",
                  total: 0,
                  writeDisabledCode: "COMMERCE_DISABLED",
                  writable: false,
                },
              }),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /products expected 409 COMMERCE_DISABLED/,
      );
    },
  );
});

test("feature flag smoke rejects missing commerce disabled details", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/public/cart": () =>
          jsonResponse(
            {
              code: "COMMERCE_DISABLED",
              message: "Commerce is disabled.",
            },
            { status: 409, statusText: "Conflict" },
          ),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        /public\/cart did not expose Commerce disabled details\./,
      );
    },
  );
});

test("feature flag smoke rejects commerce disabled detail drift safely", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/webhooks/stripe": () =>
          jsonResponse(
            {
              code: "COMMERCE_DISABLED",
              details: {
                action: "receive-webhook",
                commerceEnabled: false,
                leakedSignature: "smoke-signature",
                reservedPhase: "phase-2",
                resource: "stripe-webhook",
                writable: false,
                writeDisabledCode: "COMMERCE_DISABLED",
              },
              message: "Commerce is disabled.",
            },
            { status: 409, statusText: "Conflict" },
          ),
      },
    }),
    async () => {
      await assert.rejects(
        () =>
          assertFeatureFlagsDisabled(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
            },
            "access-token",
          ),
        (error) => {
          assert.match(
            error.message,
            /webhooks\/stripe exposed unexpected Commerce disabled detail keys\./,
          );
          assert.equal(error.message.includes("smoke-signature"), false);
          return true;
        },
      );
    },
  );
});

function assertDetailPlaceholderCall(call) {
  assert.ok(call);
  assert.equal(call.init.method, "GET");
  assert.equal(call.init.redirect, "manual");
  assert.equal(call.init.headers.Authorization, "Bearer access-token");
}
