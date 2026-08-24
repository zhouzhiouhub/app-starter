import assert from "node:assert/strict";
import test from "node:test";
import {
  storefrontExternalLinkRel,
  storefrontExternalLinkTarget,
} from "../src/features/pages/storefront-link-policy.ts";

test("storefront admin links cannot access the admin opener", () => {
  assert.equal(storefrontExternalLinkTarget, "_blank");
  assert.equal(storefrontExternalLinkRel, "noopener noreferrer");
});
