import assert from "node:assert/strict";
import test from "node:test";
import {
  hasValidRevalidateSecret,
  readConfiguredRevalidateSecret,
} from "../src/lib/revalidate-secret.ts";

test("revalidate secret helper reads trimmed configured secrets", () => {
  assert.equal(
    readConfiguredRevalidateSecret({
      STOREFRONT_REVALIDATE_SECRET: " shared-secret ",
    }),
    "shared-secret",
  );
  assert.equal(readConfiguredRevalidateSecret({}), "");
});

test("revalidate secret helper ignores unsafe configured secrets", () => {
  assert.equal(
    readConfiguredRevalidateSecret({
      STOREFRONT_REVALIDATE_SECRET: "secret-1\r\nx-secret: leaked",
    }),
    "",
  );
  assert.equal(
    readConfiguredRevalidateSecret({
      STOREFRONT_REVALIDATE_SECRET: "shared-secret\n",
    }),
    "",
  );
  assert.equal(
    readConfiguredRevalidateSecret({
      STOREFRONT_REVALIDATE_SECRET: "\t",
    }),
    "",
  );
  assert.equal(
    readConfiguredRevalidateSecret({
      STOREFRONT_REVALIDATE_SECRET: "a".repeat(1025),
    }),
    "",
  );
});

test("revalidate secret helper compares configured and provided secrets safely", () => {
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared-secret",
      providedSecret: "shared-secret",
    }),
    true,
  );
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared-secret",
      providedSecret: "wrong-secret",
    }),
    false,
  );
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared-secret",
      providedSecret: null,
    }),
    false,
  );
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "",
      providedSecret: "shared-secret",
    }),
    false,
  );
});

test("revalidate secret helper rejects oversized secrets before comparing", () => {
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared-secret",
      providedSecret: "a".repeat(1025),
    }),
    false,
  );
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "a".repeat(1025),
      providedSecret: "a".repeat(1025),
    }),
    false,
  );
});

test("revalidate secret helper rejects control characters before comparing", () => {
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared\rsecret",
      providedSecret: "shared-secret",
    }),
    false,
  );
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared-secret\n",
      providedSecret: "shared-secret",
    }),
    false,
  );
  assert.equal(
    hasValidRevalidateSecret({
      configuredSecret: "shared-secret",
      providedSecret: "shared-secret\u007f",
    }),
    false,
  );
});
