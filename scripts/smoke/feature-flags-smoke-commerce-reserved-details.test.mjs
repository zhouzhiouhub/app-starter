import assert from "node:assert/strict";
import test from "node:test";
import { assertFeatureFlagsDisabled } from "./feature-flags-smoke.mjs";
import {
  createFeatureFlagSmokeFetch,
  jsonResponse,
} from "./feature-flags-smoke-test-helpers.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("feature flag smoke rejects missing commerce reserved details", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/orders/smoke-order": () =>
          jsonResponse(
            {
              code: "NOT_FOUND",
              message: "Order details are reserved.",
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
        /orders\/smoke-order did not expose Commerce reserved details\./,
      );
    },
  );
});

test("feature flag smoke rejects commerce reserved detail drift", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/payments/smoke-payment": () =>
          jsonResponse(
            {
              code: "NOT_FOUND",
              details: {
                action: "read",
                available: false,
                commerceEnabled: false,
                readUnavailableCode: "NOT_FOUND",
                reservedPhase: "phase-2",
                resource: "order",
                surface: "admin",
                writable: false,
              },
              message: "Payment details are reserved.",
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
        /payments\/smoke-payment Commerce reserved detail.resource did not match the MVP reserved contract\./,
      );
    },
  );
});

test("feature flag smoke rejects commerce reserved detail key drift safely", async () => {
  await withFetch(
    createFeatureFlagSmokeFetch({
      overrides: {
        "/public/products/smoke-product": () =>
          jsonResponse(
            {
              code: "NOT_FOUND",
              details: {
                action: "read",
                available: false,
                commerceEnabled: false,
                leakedSlug: "smoke-product",
                readUnavailableCode: "NOT_FOUND",
                reservedPhase: "phase-2",
                resource: "product",
                surface: "public",
                writable: false,
              },
              message: "Public product pages are reserved.",
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
        (error) => {
          assert.match(
            error.message,
            /public\/products\/smoke-product leaked the placeholder identifier\./,
          );
          assert.equal(error.message.includes("leakedSlug"), false);
          return true;
        },
      );
    },
  );
});
