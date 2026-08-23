import assert from "node:assert/strict";
import test from "node:test";
import { readPreviewTokenParam } from "../src/lib/preview-token-param.ts";

const validPreviewToken = `payload.${"a".repeat(43)}`;

test("preview token query reader accepts a single token parameter", () => {
  assert.equal(readPreviewTokenParam(validPreviewToken), validPreviewToken);
});

test("preview token query reader rejects missing, duplicated, and malformed token parameters", () => {
  assert.equal(readPreviewTokenParam(undefined), null);

  for (const value of [
    ["payload.signature", "shadow.signature"],
    "",
    "payload.signature",
    "payload.signature.extra",
    "payload.signature!",
    `payload.${"a".repeat(42)}`,
    `${"a".repeat(2049)}.${"b".repeat(43)}`,
    " payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ",
  ]) {
    assert.equal(readPreviewTokenParam(value), null);
  }
});
