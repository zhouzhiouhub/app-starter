import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminStorefrontPathError,
  getStorefrontPagePath,
  readStorefrontPagePath,
} from "../src/features/pages/storefront-path.ts";

test("storefront path helper validates storefront page paths", () => {
  assert.equal(getStorefrontPagePath("campaign", "en-US"), "/en/campaign");
  assert.equal(getStorefrontPagePath("home", "en-US"), "/en");

  for (const input of [
    { locale: "en-US", slug: "campaign?token=secret" },
    { locale: "en-US", slug: "../admin" },
    { locale: "bad_locale", slug: "campaign" },
  ]) {
    assert.throws(
      () => getStorefrontPagePath(input.slug, input.locale),
      AdminStorefrontPathError,
    );
    assert.deepEqual(readStorefrontPagePath(input), {
      message:
        "Page slug or locale is invalid, so the storefront link cannot be built.",
      ok: false,
    });
  }
});
