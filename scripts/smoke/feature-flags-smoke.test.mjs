import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFeatureFlagsDisabled,
  formatDisabledEndpointDiagnostic,
  readApiErrorCode,
  readDisabledEndpointDiagnostic,
} from "./feature-flags-smoke.mjs";
import { createFeatureFlagSmokeFetch } from "./feature-flags-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("feature flag smoke helpers read API error codes", () => {
  assert.equal(
    readApiErrorCode({
      error: {
        code: "COMMERCE_DISABLED",
      },
    }),
    "COMMERCE_DISABLED",
  );
  assert.equal(
    readApiErrorCode({ code: "MULTI_LOCALE_DISABLED" }),
    "MULTI_LOCALE_DISABLED",
  );
  assert.equal(readApiErrorCode({}), null);
});

test("feature flag smoke helpers summarize disabled endpoint responses", () => {
  const diagnostic = readDisabledEndpointDiagnostic({
    body: {
      error: {
        code: "COMMERCE_DISABLED",
        message: "Commerce is disabled.",
      },
    },
    status: 409,
    statusText: "Conflict",
  });

  assert.deepEqual(diagnostic, {
    code: "COMMERCE_DISABLED",
    message: "Commerce is disabled.",
    status: 409,
    statusText: "Conflict",
  });
  assert.equal(
    formatDisabledEndpointDiagnostic(diagnostic),
    "409 Conflict COMMERCE_DISABLED: Commerce is disabled.",
  );
  const unsafeDiagnostic = readDisabledEndpointDiagnostic({
    body: {
      error: {
        code: "COMMERCE_DISABLED",
        message: `Commerce disabled\u0000token=payload.signature ${"x".repeat(
          260,
        )}`,
      },
    },
    status: 409,
    statusText: "Conflict",
  });

  assert.equal(unsafeDiagnostic.message.length, 240);
  assert.equal(unsafeDiagnostic.message.endsWith("..."), true);
  assert.equal(unsafeDiagnostic.message.includes("\u0000"), false);
  assert.equal(unsafeDiagnostic.message.includes("payload.signature"), false);
  assert.match(unsafeDiagnostic.message, /token=\[redacted\]/);
  assert.equal(
    formatDisabledEndpointDiagnostic(
      readDisabledEndpointDiagnostic({
        body: null,
        redirectLocation: "https://api.example.com/login?token=%5BREDACTED%5D",
        status: 500,
        statusText: "Internal Server Error",
      }),
    ),
    "500 Internal Server Error NO_CODE: Internal Server Error redirect: https://api.example.com/login?token=%5BREDACTED%5D",
  );
});

test("feature flag smoke rejects redirected public config checks", async () => {
  const calls = [];

  await withFetch(
    async (url, init = {}) => {
      calls.push({ init, url });

      return new Response("", {
        headers: {
          Location:
            "https://api.example.com/login?token=header.payload.signature",
        },
        status: 302,
        statusText: "Found",
      });
    },
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
          assert.equal(calls[0].init.redirect, "manual");
          assert.match(error.message, /Public config failed\. 302: Found/);
          assert.match(error.message, /redirect:/);
          assert.equal(
            error.message.includes("header.payload.signature"),
            false,
          );
          return true;
        },
      );
    },
  );
});

test("feature flag smoke checks disabled feature placeholders", async () => {
  const calls = [];

  await withFetch(createFeatureFlagSmokeFetch({ calls }), async () => {
    await assertFeatureFlagsDisabled(
      {
        apiBaseUrl: "https://api.example.com/api/v1",
      },
      "access-token",
    );
  });

  const webhookCall = calls.find((call) =>
    call.url.endsWith("/webhooks/stripe"),
  );
  const productCall = calls.find((call) =>
    call.url.endsWith("/public/products/smoke-product"),
  );
  const adminProductDetailCall = calls.find(
    (call) =>
      call.url.endsWith("/products/smoke-product") &&
      !call.url.endsWith("/public/products/smoke-product") &&
      call.init.method === "GET",
  );
  const adminProductCreateCall = calls.find(
    (call) => call.url.endsWith("/products") && call.init.method === "POST",
  );
  const adminProductUpdateCall = calls.find(
    (call) =>
      call.url.endsWith("/products/smoke-product") &&
      call.init.method === "PATCH",
  );
  const cartCall = calls.find((call) => call.url.endsWith("/public/cart"));
  const checkoutCall = calls.find((call) =>
    call.url.endsWith("/public/checkout"),
  );
  const translationExportCall = calls.find((call) =>
    call.url.endsWith("/translations/export"),
  );
  const translationImportCall = calls.find((call) =>
    call.url.endsWith("/translations/import"),
  );

  assert.ok(productCall);
  assert.equal(productCall.init.method, "GET");
  assert.equal(productCall.init.redirect, "manual");
  assertAdminProductPlaceholderCall(adminProductDetailCall, "GET");
  assertAdminProductPlaceholderCall(adminProductCreateCall, "POST");
  assertAdminProductPlaceholderCall(adminProductUpdateCall, "PATCH");
  assertPublicCommerceWriteCall(cartCall, "add-to-cart");
  assertPublicCommerceWriteCall(checkoutCall, "checkout");
  assert.ok(webhookCall);
  assert.equal(webhookCall.init.method, "POST");
  assert.equal(webhookCall.init.redirect, "manual");
  assert.equal(
    webhookCall.init.headers["Stripe-Signature"],
    "t=1,v1=smoke-signature",
  );
  assert.match(webhookCall.init.body, /evt_smoke_webhook/);
  assert.ok(translationExportCall);
  assert.equal(translationExportCall.init.method, "POST");
  assert.match(translationExportCall.init.body, /"locale":"de-DE"/);
  assert.ok(translationImportCall);
  assert.equal(translationImportCall.init.method, "POST");
  assert.equal(
    translationImportCall.init.headers["Idempotency-Key"],
    "d59af848-cb88-4267-929f-65b14d9f8f30",
  );
  assert.match(translationImportCall.init.body, /"locale":"de-DE"/);

  for (const suffix of [
    "/markets",
    "/locales",
    "/translations?locale=de-DE",
    "/translations/import",
    "/translations/export",
    "/products",
    "/products/smoke-product/variants",
    "/products/smoke-product/prices",
    "/products/smoke-product/inventory",
    "/orders",
    "/payments",
  ]) {
    const call = calls.find((candidate) => candidate.url.endsWith(suffix));

    assert.ok(call);
    assert.equal(call.init.redirect, "manual");
    assert.equal(call.init.headers.Authorization, "Bearer access-token");
  }
});

function assertAdminProductPlaceholderCall(call, method) {
  assert.ok(call);
  assert.equal(call.init.method, method);
  assert.equal(call.init.redirect, "manual");
  assert.equal(call.init.headers.Authorization, "Bearer access-token");

  if (method !== "GET") {
    assert.match(
      call.init.headers["Idempotency-Key"],
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  }
}

function assertPublicCommerceWriteCall(call, expectedAction) {
  assert.ok(call);
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.redirect, "manual");
  assert.equal(call.init.headers["Content-Type"], "application/json");
  assert.equal(call.init.headers.Authorization, undefined);
  assert.match(
    call.init.headers["Idempotency-Key"],
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.equal(call.init.body.includes(expectedAction), false);
}
