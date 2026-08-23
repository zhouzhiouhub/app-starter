import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminStorefrontUrlConfigurationError,
  getStorefrontPageUrl,
  getStorefrontPreviewUrl,
  readStorefrontPageUrl,
  resolveStorefrontOrigin,
  resolveWebOrigin,
} from "../src/features/pages/storefront-url.ts";

test("storefront URL helper accepts safe configured web origins", () => {
  assert.equal(
    resolveWebOrigin({
      configured: " https://web.example.com/ ",
    }),
    "https://web.example.com",
  );
  assert.equal(
    resolveWebOrigin({
      configured: "http://localhost:3000/",
    }),
    "http://localhost:3000",
  );
});

test("storefront URL helper accepts production-safe web origins", () => {
  assert.equal(
    resolveWebOrigin({
      configured: " https://store.brand-platform.com/ ",
      isProd: true,
    }),
    "https://store.brand-platform.com",
  );
});

test("storefront URL helper falls back to generic WEB_URL origins", () => {
  assert.equal(
    resolveWebOrigin({
      configured: "https://bad.example.com/storefront",
      fallbackConfigured: " https://web.example.com/ ",
      windowLocation: {
        hostname: "admin.example.com",
        protocol: "https:",
      },
    }),
    "https://web.example.com",
  );
});

test("storefront URL helper rejects unsafe configured web origins", () => {
  const windowLocation = {
    hostname: "admin.example.com",
    protocol: "https:",
  };

  assert.equal(
    resolveWebOrigin({
      configured: "javascript:alert(1)",
      windowLocation,
    }),
    "https://admin.example.com:3000",
  );
  assert.equal(
    resolveWebOrigin({
      configured: "https://user:password@web.example.com",
      windowLocation,
    }),
    "https://admin.example.com:3000",
  );
  assert.equal(
    resolveWebOrigin({
      configured: "ftp://web.example.com",
      windowLocation,
    }),
    "https://admin.example.com:3000",
  );
  assert.equal(
    resolveWebOrigin({
      configured: "https://web.example.com/storefront",
      windowLocation,
    }),
    "https://admin.example.com:3000",
  );
  assert.equal(
    resolveWebOrigin({
      configured: "https://web.example.com?tenant=1",
      windowLocation,
    }),
    "https://admin.example.com:3000",
  );
  assert.equal(
    resolveWebOrigin({
      configured: "https://web.example.com#preview",
      windowLocation,
    }),
    "https://admin.example.com:3000",
  );
});

test("storefront URL helper ignores unsafe production web origins", () => {
  const windowLocation = {
    hostname: "admin.brand-platform.com",
    protocol: "https:",
  };

  assert.equal(
    resolveWebOrigin({
      configured: "http://store.brand-platform.com",
      fallbackConfigured: "https://store.brand-platform.com/",
      isProd: true,
      windowLocation,
    }),
    "https://store.brand-platform.com",
  );

  for (const configured of [
    "https://localhost:3000",
    "https://store.example",
    "https://192.0.2.10",
  ]) {
    assert.throws(
      () =>
        resolveWebOrigin({
          configured,
          fallbackConfigured: "https://store.example.com",
          isProd: true,
          windowLocation,
        }),
      {
        message:
          "VITE_WEB_URL or WEB_URL must be configured as a safe storefront origin in production.",
        name: "AdminStorefrontUrlConfigurationError",
      },
    );
  }
});

test("storefront URL helper fails fast without a safe production web origin", () => {
  assert.throws(
    () =>
      resolveWebOrigin({
        configured: "",
        fallbackConfigured: "",
        isProd: true,
        windowLocation: {
          hostname: "admin.brand-platform.com",
          protocol: "https:",
        },
      }),
    AdminStorefrontUrlConfigurationError,
  );
});

test("storefront URL helper returns a display-safe unavailable result", () => {
  assert.deepEqual(
    readStorefrontPageUrl({
      locale: "en-US",
      runtime: {
        configured: "http://localhost:3000",
        fallbackConfigured: "https://store.example.com",
        isProd: true,
        windowLocation: {
          hostname: "admin.brand-platform.com",
          protocol: "https:",
        },
      },
      siteDomain: null,
      slug: "campaign",
    }),
    {
      message:
        "Configure VITE_WEB_URL or WEB_URL with a safe storefront origin before opening storefront links.",
      ok: false,
    },
  );
});

test("storefront URL helper falls back to localhost without a browser origin", () => {
  assert.equal(
    resolveWebOrigin({
      configured: "",
      windowLocation: {
        hostname: "desktop",
        protocol: "file:",
      },
    }),
    "http://localhost:3000",
  );
});

test("storefront URL helper builds safe page and preview links", () => {
  const token = `payload.${"a".repeat(43)}`;

  withWindow(
    {
      location: {
        hostname: "admin.example.com",
        protocol: "https:",
      },
    },
    () => {
      assert.equal(
        getStorefrontPageUrl("campaign", "en-US"),
        "https://admin.example.com:3000/en/campaign",
      );
      assert.equal(
        getStorefrontPreviewUrl(token),
        `https://admin.example.com:3000/preview?token=${token}`,
      );
    },
  );
});

test("storefront URL helper prefers current site domains for public links", () => {
  const token = `payload.${"a".repeat(43)}`;

  assert.equal(
    resolveStorefrontOrigin({
      configured: "https://web.example.com",
      siteDomain: "Store.Brand-Platform.com:443",
    }),
    "https://store.brand-platform.com",
  );
  assert.equal(
    resolveStorefrontOrigin({
      configured: "http://localhost:3000",
      fallbackConfigured: "https://store.example.com",
      isProd: true,
      siteDomain: "Store.Brand-Platform.com:443",
    }),
    "https://store.brand-platform.com",
  );
  assert.equal(
    getStorefrontPageUrl("campaign", "en-US", "store.brand-platform.com"),
    "https://store.brand-platform.com/en/campaign",
  );
  assert.equal(
    getStorefrontPreviewUrl(token, "localhost:3000"),
    `http://localhost:3000/preview?token=${token}`,
  );
});

test("storefront URL helper rejects malformed preview tokens", () => {
  for (const token of [
    "",
    "payload.signature.extra",
    "payload.signature!",
    " payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ",
    `payload.${"a".repeat(42)}`,
    `${"a".repeat(2049)}.${"b".repeat(43)}`,
  ]) {
    assert.throws(
      () => getStorefrontPreviewUrl(token),
      /Preview token is malformed/,
    );
  }
});

function withWindow(windowValue, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowValue,
  });

  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "window", descriptor);
    } else {
      delete globalThis.window;
    }
  }
}
