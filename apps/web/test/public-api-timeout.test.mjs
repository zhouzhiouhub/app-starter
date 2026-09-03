import assert from "node:assert/strict";
import test from "node:test";
import {
  createPublicApiAbortSignal,
  publicApiFetchTimeoutMs,
} from "../src/lib/public-api-timeout.ts";

test("public API abort signal expires after the shared timeout", async () => {
  assert.equal(publicApiFetchTimeoutMs, 5000);

  const signal = createPublicApiAbortSignal();

  assert.equal(signal instanceof AbortSignal, true);
  assert.equal(signal.aborted, false);
});
