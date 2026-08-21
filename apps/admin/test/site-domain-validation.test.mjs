import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSiteDomainInput,
  readSiteDomainFormError,
  validateSiteDomainFormValue,
} from "../src/features/site-settings/site-domain-validation.ts";

test("site domain validation accepts localhost and public hosts", async () => {
  assert.equal(
    normalizeSiteDomainInput(" Store.Brand-Platform.com "),
    "store.brand-platform.com",
  );
  assert.equal(readSiteDomainFormError("localhost"), null);
  assert.equal(readSiteDomainFormError("store.brand-platform.com"), null);
  await validateSiteDomainFormValue({}, "store.brand-platform.com");
});

test("site domain validation rejects placeholder and local network hosts", async () => {
  assert.match(
    readSiteDomainFormError("store.example.com") ?? "",
    /public hostname/,
  );
  assert.match(readSiteDomainFormError("127.0.0.1") ?? "", /public hostname/);
  assert.match(
    readSiteDomainFormError("https://store.brand-platform.com") ?? "",
    /protocol/,
  );

  await assert.rejects(
    () => validateSiteDomainFormValue({}, "store.example.com"),
    /public hostname/,
  );
});
