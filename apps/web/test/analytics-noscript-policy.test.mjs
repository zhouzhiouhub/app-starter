import assert from "node:assert/strict";
import test from "node:test";
import { shouldRenderGtmNoScriptFallback } from "../src/lib/analytics-noscript-policy.ts";

test("web analytics keeps GTM no-script fallback disabled for preview safety", () => {
  assert.equal(shouldRenderGtmNoScriptFallback(), false);
});
