import assert from "node:assert/strict";
import test from "node:test";
import { openStorefrontPreviewWindow } from "../src/features/pages/preview-window.ts";

test("preview windows open without access to the admin opener", () => {
  const openedWindow = { opener: { location: "admin" } };
  const calls = [];

  withOpen((url, target, features) => {
    calls.push({ features, target, url });
    return openedWindow;
  }, () => {
    openStorefrontPreviewWindow("https://web.example.com/preview?token=abc");
  });

  assert.deepEqual(calls, [
    {
      features: "noopener,noreferrer",
      target: "_blank",
      url: "https://web.example.com/preview?token=abc",
    },
  ]);
  assert.equal(openedWindow.opener, null);
});

test("preview window opener cleanup tolerates blocked popups", () => {
  const calls = [];

  withOpen((url, target, features) => {
    calls.push({ features, target, url });
    return null;
  }, () => {
    openStorefrontPreviewWindow("https://web.example.com/preview?token=abc");
  });

  assert.equal(calls.length, 1);
});

test("preview window opener cleanup tolerates restricted windows", () => {
  const restrictedWindow = {};
  Object.defineProperty(restrictedWindow, "opener", {
    set() {
      throw new Error("opener is restricted");
    },
  });

  withOpen(() => restrictedWindow, () => {
    assert.doesNotThrow(() =>
      openStorefrontPreviewWindow("https://web.example.com/preview?token=abc"),
    );
  });
});

test("preview windows reject unsafe URLs before opening", () => {
  const calls = [];

  withOpen((url, target, features) => {
    calls.push({ features, target, url });
    return null;
  }, () => {
    for (const url of [
      "javascript:alert(1)",
      "https://user:pass@web.example.com/preview?token=abc",
      "https://web.example.com/preview?token=abc#access_token=secret",
      "/preview?token=abc",
    ]) {
      openStorefrontPreviewWindow(url);
    }
  });

  assert.deepEqual(calls, []);
});

function withOpen(openImplementation, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "open");

  Object.defineProperty(globalThis, "open", {
    configurable: true,
    value: openImplementation,
  });

  try {
    callback();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "open", descriptor);
    } else {
      delete globalThis.open;
    }
  }
}
