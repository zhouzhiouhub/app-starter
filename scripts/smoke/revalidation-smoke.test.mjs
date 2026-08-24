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
        reason: "request-timeout",
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    {
      diagnosis: "request-timeout",
      pathCount: 1,
      paths: ["/en/contact"],
      reason: "request-timeout",
      required: true,
      status: null,
      tagCount: 0,
      tags: [],
      triggered: false,
    },
  );
});

test("smoke helpers classify revalidation HTTP failures", () => {
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 400,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "invalid-revalidation-payload",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "revalidation-secret-mismatch",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 404,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "revalidate-route-missing",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 503,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "web-revalidation-not-configured",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 500,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "web-revalidation-failed",
  );
});
