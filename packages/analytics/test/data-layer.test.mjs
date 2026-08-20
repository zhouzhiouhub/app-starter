import assert from "node:assert/strict";
import test from "node:test";
import { pushDataLayer, sanitizeAnalyticsPayload } from "../src/index.ts";

test("analytics payload sanitizer removes reserved and sensitive fields", () => {
  assert.deepEqual(
    sanitizeAnalyticsPayload({
      email: "buyer@example.com",
      event: "override",
      locale: "de-DE",
      nested: {
        phoneNumber: "+15551234567",
        plan: "pro",
      },
      orders: [
        {
          sku: "sku-1",
          token: "secret-token",
        },
      ],
      site_id: "other-site",
      value: 29,
    }),
    {
      nested: {
        plan: "pro",
      },
      orders: [
        {
          sku: "sku-1",
        },
      ],
      value: 29,
    },
  );
});

test("data layer events preserve trusted analytics context", () => {
  withWindow({}, (windowValue) => {
    pushDataLayer({
      locale: "en-US",
      market: "us",
      name: "lead_submitted",
      payload: {
        event: "overridden",
        market: "eu",
        pageType: "landing",
        tenant_id: "other-tenant",
        userEmail: "buyer@example.com",
      },
      siteId: "site-1",
      tenantId: "tenant-1",
    });

    assert.deepEqual(windowValue.dataLayer, [
      {
        event: "lead_submitted",
        locale: "en-US",
        market: "us",
        pageType: "landing",
        site_id: "site-1",
        tenant_id: "tenant-1",
      },
    ]);
  });
});

test("data layer push is a no-op outside the browser", () => {
  withWindow(undefined, () => {
    assert.doesNotThrow(() =>
      pushDataLayer({
        name: "server_event",
      }),
    );
  });
});

function withWindow(windowValue, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  if (windowValue === undefined) {
    delete globalThis.window;
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: windowValue,
    });
  }

  try {
    callback(windowValue);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
    } else {
      delete globalThis.window;
    }
  }
}
