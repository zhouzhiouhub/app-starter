import assert from "node:assert/strict";
import test from "node:test";
import {
  getStorefrontPageUrl,
  getStorefrontPreviewUrl,
  resolveWebOrigin,
} from "../src/features/pages/storefront-url.ts";

test("storefront URL helper accepts safe configured web origins", () => {
  assert.equal(
    resolveWebOrigin({
      configured: " https://web.example.com/storefront/ ",
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
        getStorefrontPreviewUrl("a+b/c"),
        "https://admin.example.com:3000/preview?token=a%2Bb%2Fc",
      );
    },
  );
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
