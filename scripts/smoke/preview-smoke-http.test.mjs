import assert from "node:assert/strict";
import test from "node:test";
import { readErrorMessage, readHttpError } from "./preview-smoke-http.mjs";

test("preview smoke HTTP helpers format safe errors", () => {
  assert.equal(
    readHttpError(
      {
        body: {
          error: {
            message: "Token expired.",
          },
        },
        status: 401,
        statusText: "Unauthorized",
      },
      "Public preview API failed.",
    ),
    "Public preview API failed. 401: Token expired.",
  );
  assert.equal(
    readHttpError(
      {
        body: null,
        status: 503,
        statusText: "Service Unavailable",
      },
      "Web preview failed.",
    ),
    "Web preview failed. 503: Service Unavailable",
  );
  assert.equal(readErrorMessage(new Error("network down")), "network down");
  assert.equal(readErrorMessage("plain failure"), "plain failure");
});
