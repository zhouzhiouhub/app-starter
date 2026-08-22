import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDisabledEndpointDiagnostic,
  readApiErrorCode,
  readDisabledEndpointDiagnostic,
} from "./feature-flags-smoke.mjs";

test("feature flag smoke helpers read API error codes", () => {
  assert.equal(
    readApiErrorCode({
      error: {
        code: "COMMERCE_DISABLED",
      },
    }),
    "COMMERCE_DISABLED",
  );
  assert.equal(
    readApiErrorCode({ code: "MULTI_LOCALE_DISABLED" }),
    "MULTI_LOCALE_DISABLED",
  );
  assert.equal(readApiErrorCode({}), null);
});

test("feature flag smoke helpers summarize disabled endpoint responses", () => {
  const diagnostic = readDisabledEndpointDiagnostic({
    body: {
      error: {
        code: "COMMERCE_DISABLED",
        message: "Commerce is disabled.",
      },
    },
    status: 409,
    statusText: "Conflict",
  });

  assert.deepEqual(diagnostic, {
    code: "COMMERCE_DISABLED",
    message: "Commerce is disabled.",
    status: 409,
    statusText: "Conflict",
  });
  assert.equal(
    formatDisabledEndpointDiagnostic(diagnostic),
    "409 Conflict COMMERCE_DISABLED: Commerce is disabled.",
  );
  assert.equal(
    formatDisabledEndpointDiagnostic(
      readDisabledEndpointDiagnostic({
        body: null,
        status: 500,
        statusText: "Internal Server Error",
      }),
    ),
    "500 Internal Server Error NO_CODE: Internal Server Error",
  );
});
