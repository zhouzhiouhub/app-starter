import assert from "node:assert/strict";
import test from "node:test";
import { pushDataLayer, sanitizeAnalyticsPayload } from "../src/index.ts";

test("analytics payload sanitizer removes reserved and sensitive fields", () => {
  assert.deepEqual(
    sanitizeAnalyticsPayload({
      apiKey: "api-key-value",
      authCookie: "session=abc",
      codeVerifier: "pkce-secret",
      email: "buyer@example.com",
      event: "override",
      locale: "de-DE",
      nested: {
        requestSignature: "signature-value",
        sessionId: "session-id",
        phoneNumber: "+15551234567",
        plan: "pro",
      },
      oauthVerifier: "oauth-verifier-secret",
      orders: [
        {
          r2AccessKeyId: "access-key",
          sku: "sku-1",
          token: "secret-token",
        },
      ],
      paymentCredential: "credential-value",
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

test("analytics payload sanitizer redacts sensitive string values", () => {
  assert.deepEqual(
    sanitizeAnalyticsPayload({
      contactLabel: "Primary buyer@example.com",
      nested: {
        owner: "Call +1 (555) 123-4567",
        plan: "starter",
      },
      notes: [
        "no pii here",
        "backup admin@example.com",
      ],
      sku: "sku-123",
    }),
    {
      contactLabel: "[redacted]",
      nested: {
        owner: "[redacted]",
        plan: "starter",
      },
      notes: ["no pii here", "[redacted]"],
      sku: "sku-123",
    },
  );
});

test("analytics payload sanitizer redacts URLs with sensitive credentials", () => {
  assert.deepEqual(
    sanitizeAnalyticsPayload({
      callback:
        "Webhook failed with Authorization: Bearer header.payload.signature",
      imageUrl:
        "https://cdn.example.com/hero.jpg?X-Amz-Signature=signed-value",
      nested: {
        previewUrl: "https://store.example.com/preview?preview_token=secret",
        publicUrl: "https://store.example.com/page?variant=summer",
      },
      redirects: [
        "/checkout?token=secret",
        "/callback?access%5Ftoken=secret",
        "https://cdn.example.com/file?Policy=signed-policy&sig=signed-value",
        "https://store.example.com/page?utm_source=newsletter",
      ],
      signedUrl: "https://user:password@example.com/download",
    }),
    {
      callback: "[redacted]",
      imageUrl: "[redacted]",
      nested: {
        previewUrl: "[redacted]",
        publicUrl: "https://store.example.com/page?variant=summer",
      },
      redirects: [
        "[redacted]",
        "[redacted]",
        "[redacted]",
        "https://store.example.com/page?utm_source=newsletter",
      ],
      signedUrl: "[redacted]",
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
