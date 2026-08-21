import assert from "node:assert/strict";
import test from "node:test";
import { isProductionHttpUrl } from "../dist/index.js";

test("production HTTP URL helper accepts deployed HTTPS hosts", () => {
  assert.equal(
    isProductionHttpUrl(new URL("https://store.brand-platform.com")),
    true,
  );
});

test("production HTTP URL helper rejects unsafe production hosts", () => {
  for (const value of [
    "http://store.brand-platform.com",
    "https://localhost",
    "https://host.docker.internal",
    "https://10.0.0.1",
    "https://100.64.0.10",
    "https://192.168.1.10",
    "https://[::1]",
    "https://[::ffff:7f00:1]",
    "https://store.example",
    "https://store.example.com",
    "https://192.0.2.10",
    "https://[2001:db8::1]",
    "https://[::ffff:c000:020a]",
  ]) {
    assert.equal(isProductionHttpUrl(new URL(value)), false);
  }
});
