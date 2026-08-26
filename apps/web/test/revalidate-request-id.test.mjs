import assert from "node:assert/strict";
import test from "node:test";
import { readRevalidateRequestId } from "../src/lib/revalidate-request-id.ts";

test("revalidate request id helper accepts compact safe identifiers", () => {
  assert.equal(
    readRevalidateRequestId(" request-1.alpha:beta_2 "),
    "request-1.alpha:beta_2",
  );
});

test("revalidate request id helper rejects unsafe identifiers", () => {
  assert.equal(readRevalidateRequestId(null), "local-dev");
  assert.equal(readRevalidateRequestId(" "), "local-dev");
  assert.equal(readRevalidateRequestId("request-1\n"), "local-dev");
  assert.equal(readRevalidateRequestId("\trequest-2"), "local-dev");
  assert.equal(
    readRevalidateRequestId("request-1\nx-secret: leaked"),
    "local-dev",
  );
  assert.equal(readRevalidateRequestId("a".repeat(129)), "local-dev");
});
