import assert from "node:assert/strict";
import test from "node:test";
import { readPreviewTokenParam } from "../src/lib/preview-token-param.ts";

test("preview token query reader accepts a single token parameter", () => {
  assert.equal(readPreviewTokenParam("payload.signature"), "payload.signature");
});

test("preview token query reader rejects missing or duplicated token parameters", () => {
  assert.equal(readPreviewTokenParam(undefined), null);
  assert.equal(
    readPreviewTokenParam(["payload.signature", "shadow.signature"]),
    null,
  );
});
