import assert from "node:assert/strict";
import test from "node:test";
import { createRevalidationSmokeDetails } from "./revalidation-smoke.mjs";

test("smoke helpers summarize revalidation results for reports", () => {
  assert.deepEqual(
    createRevalidationSmokeDetails(
      {
        paths: ["/", "/en"],
        tags: ["published-page"],
        triggered: true,
      },
      { requireRevalidation: true },
    ),
    {
      diagnosis: "triggered",
      pathCount: 2,
      paths: ["/", "/en"],
      reason: null,
      required: true,
      status: null,
      tagCount: 1,
      tags: ["published-page"],
      triggered: true,
    },
  );

  assert.deepEqual(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    {
      diagnosis: "request-failed-or-timeout",
      pathCount: 1,
      paths: ["/en/contact"],
      reason: "request-failed",
      required: true,
      status: null,
      tagCount: 0,
      tags: [],
      triggered: false,
    },
  );
});
