import assert from "node:assert/strict";
import test from "node:test";
import { readPublishPreflightFocusStyle } from "../src/features/pages/publish-preflight-focus-style.ts";

test("publish preflight focus style highlights the active area", () => {
  assert.equal(
    readPublishPreflightFocusStyle("seo", "seo").outline,
    "2px solid #1677ff",
  );
  assert.equal(
    readPublishPreflightFocusStyle("chrome", "seo").outline,
    "2px solid transparent",
  );
});

test("publish preflight focus style keeps stable layout properties", () => {
  assert.deepEqual(readPublishPreflightFocusStyle("media", null), {
    borderRadius: 8,
    outline: "2px solid transparent",
    outlineOffset: 4,
    transition: "outline-color 180ms ease",
  });
});
