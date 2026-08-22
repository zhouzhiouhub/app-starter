import assert from "node:assert/strict";
import test from "node:test";
import { requireIdempotencyKey } from "../dist/common/idempotency-key.js";

test("requireIdempotencyKey accepts UUID values", () => {
  assert.equal(
    requireIdempotencyKey("7f10f6d3-02d9-4f3d-a69d-49b26ec63132"),
    "7f10f6d3-02d9-4f3d-a69d-49b26ec63132",
  );
});

test("requireIdempotencyKey rejects missing or non-UUID values", () => {
  assert.throws(() => requireIdempotencyKey(undefined), {
    name: "BadRequestException",
  });
  assert.throws(() => requireIdempotencyKey("retry-me"), {
    name: "BadRequestException",
  });
});
