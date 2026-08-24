import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFeatureFlagsDisabled,
  formatDisabledEndpointDiagnostic,
  readApiErrorCode,
  readDisabledEndpointDiagnostic,
} from "./feature-flags-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

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

test("feature flag smoke rejects redirected public config checks", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    return new Response("", {
      headers: {
        Location:
          "https://api.example.com/login?token=header.payload.signature",
      },
      status: 302,
      statusText: "Found",
    });
  }, async () => {
    await assert.rejects(
      () =>
        assertFeatureFlagsDisabled(
          {
            apiBaseUrl: "https://api.example.com/api/v1",
          },
          "access-token",
        ),
      (error) => {
        assert.equal(calls[0].init.redirect, "manual");
        assert.match(error.message, /Public config failed\. 302: Found/);
        assert.match(error.message, /redirect:/);
        assert.equal(error.message.includes("header.payload.signature"), false);
        return true;
      },
    );
  });
});
