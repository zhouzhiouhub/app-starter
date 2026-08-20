import assert from "node:assert/strict";
import test from "node:test";
import { formatPublishRevalidationFailure } from "./publish-page-smoke.mjs";

test("publish page smoke helpers format revalidation failures with diagnostics", () => {
  assert.equal(
    formatPublishRevalidationFailure(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: ["published-page"],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    [
      "Storefront revalidation was not triggered",
      "(diagnosis: revalidation-secret-mismatch,",
      "reason: request-failed,",
      "status: 401,",
      "paths: 1,",
      "tags: 1).",
    ].join(" "),
  );
});
