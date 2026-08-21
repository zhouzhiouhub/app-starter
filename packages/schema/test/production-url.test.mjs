import assert from "node:assert/strict";
import test from "node:test";
import {
  isProductionHttpUrl,
  isUnsafeProductionHostname,
  readProductionHostnameIssue,
} from "../dist/index.js";

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

test("production hostname helper classifies unsafe hosts", () => {
  for (const hostname of [
    "localhost",
    "host.docker.internal",
    "10.0.0.1",
    "100.64.0.10",
    "192.168.1.10",
    "::1",
    "::ffff:7f00:1",
    "store.example",
    "store.example.com",
    "invalid",
    "test",
    "192.0.2.10",
    "2001:db8::1",
    "::ffff:c000:020a",
  ]) {
    assert.equal(isUnsafeProductionHostname(hostname), true);
  }

  assert.equal(isUnsafeProductionHostname("store.brand-platform.com"), false);
});

test("production hostname helper reports smoke diagnostic categories", () => {
  assert.equal(readProductionHostnameIssue("localhost"), "local-host");
  assert.equal(readProductionHostnameIssue("10.0.0.1"), "local-host");
  assert.equal(readProductionHostnameIssue("::ffff:7f00:1"), "local-host");
  assert.equal(
    readProductionHostnameIssue("store.example"),
    "placeholder-host",
  );
  assert.equal(readProductionHostnameIssue("invalid"), "placeholder-host");
  assert.equal(readProductionHostnameIssue("test"), "placeholder-host");
  assert.equal(readProductionHostnameIssue("192.0.2.10"), "placeholder-host");
  assert.equal(readProductionHostnameIssue("2001:db8::1"), "placeholder-host");
  assert.equal(readProductionHostnameIssue("store.brand-platform.com"), null);
});
