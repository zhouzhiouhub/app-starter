import assert from "node:assert/strict";
import test from "node:test";
import {
  createRevalidateErrorBody,
  createRevalidateResponseInit,
  revalidateResponseHeaders,
} from "../src/lib/revalidate-response.ts";

test("revalidate responses are marked non-cacheable", () => {
  assert.deepEqual(revalidateResponseHeaders, {
    "Cache-Control": "no-store",
  });
  assert.deepEqual(createRevalidateResponseInit(), {
    headers: revalidateResponseHeaders,
  });
  assert.deepEqual(createRevalidateResponseInit({ status: 503 }), {
    headers: revalidateResponseHeaders,
    status: 503,
  });
});

test("revalidate error response omits details when none are provided", () => {
  const body = createRevalidateErrorBody({
    code: "UNAUTHORIZED",
    message: "Invalid revalidation secret.",
    requestId: "request-1",
  });

  assert.deepEqual(body, {
    error: {
      code: "UNAUTHORIZED",
      message: "Invalid revalidation secret.",
      requestId: "request-1",
    },
  });
  assert.equal("details" in body.error, false);
});

test("revalidate error response keeps validation details when provided", () => {
  assert.deepEqual(
    createRevalidateErrorBody({
      code: "VALIDATION_ERROR",
      details: {
        fields: ["slug"],
        reason: "invalid-fields",
      },
      message: "Invalid payload.",
      requestId: "request-1",
    }),
    {
      error: {
        code: "VALIDATION_ERROR",
        details: {
          fields: ["slug"],
          reason: "invalid-fields",
        },
        message: "Invalid payload.",
        requestId: "request-1",
      },
    },
  );
});
