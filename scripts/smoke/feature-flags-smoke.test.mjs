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
        redirectLocation:
          "https://api.example.com/login?token=%5BREDACTED%5D",
        status: 500,
        statusText: "Internal Server Error",
      }),
    ),
    "500 Internal Server Error NO_CODE: Internal Server Error redirect: https://api.example.com/login?token=%5BREDACTED%5D",
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

test("feature flag smoke checks the disabled stripe webhook placeholder", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    if (url.endsWith("/public/config")) {
      return jsonResponse({
        data: {
          commerceEnabled: false,
          defaultCurrency: "USD",
          defaultLocale: "en-US",
          defaultMarket: "us",
          fallbackLocale: "en-US",
          multiLocaleEnabled: false,
        },
      });
    }

    if (url.endsWith("/public/translations/de-DE")) {
      return jsonResponse({
        data: [],
        meta: {
          fallbackLocale: "en-US",
          isFallback: true,
          locale: "en-US",
        },
      });
    }

    if (
      url.endsWith("/public/cart") ||
      url.endsWith("/public/checkout") ||
      url.endsWith("/webhooks/stripe")
    ) {
      return jsonResponse(
        {
          code: "COMMERCE_DISABLED",
          message: "Commerce is disabled.",
        },
        { status: 409, statusText: "Conflict" },
      );
    }

    if (url.endsWith("/locales")) {
      return jsonResponse(
        {
          code: "MULTI_LOCALE_DISABLED",
          message: "Multi-locale is disabled.",
        },
        { status: 409, statusText: "Conflict" },
      );
    }

    return jsonResponse({}, { status: 404, statusText: "Not Found" });
  }, async () => {
    await assertFeatureFlagsDisabled(
      {
        apiBaseUrl: "https://api.example.com/api/v1",
      },
      "access-token",
    );
  });

  const webhookCall = calls.find((call) =>
    call.url.endsWith("/webhooks/stripe"),
  );

  assert.ok(webhookCall);
  assert.equal(webhookCall.init.method, "POST");
  assert.equal(webhookCall.init.redirect, "manual");
  assert.equal(
    webhookCall.init.headers["Stripe-Signature"],
    "t=1,v1=smoke-signature",
  );
  assert.match(webhookCall.init.body, /evt_smoke_webhook/);
});

test("feature flag smoke rejects redirected stripe webhook checks safely", async () => {
  await withFetch(async (url) => {
    if (url.endsWith("/public/config")) {
      return jsonResponse({
        data: {
          commerceEnabled: false,
          defaultCurrency: "USD",
          defaultLocale: "en-US",
          defaultMarket: "us",
          fallbackLocale: "en-US",
          multiLocaleEnabled: false,
        },
      });
    }

    if (url.endsWith("/public/translations/de-DE")) {
      return jsonResponse({
        data: [],
        meta: {
          fallbackLocale: "en-US",
          isFallback: true,
          locale: "en-US",
        },
      });
    }

    if (url.endsWith("/public/cart") || url.endsWith("/public/checkout")) {
      return jsonResponse(
        {
          code: "COMMERCE_DISABLED",
          message: "Commerce is disabled.",
        },
        { status: 409, statusText: "Conflict" },
      );
    }

    if (url.endsWith("/webhooks/stripe")) {
      return new Response("", {
        headers: {
          Location:
            "https://api.example.com/login?signature=smoke-signature",
        },
        status: 302,
        statusText: "Found",
      });
    }

    return jsonResponse({}, { status: 404, statusText: "Not Found" });
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
        assert.match(
          error.message,
          /webhooks\/stripe expected 409 COMMERCE_DISABLED/,
        );
        assert.match(error.message, /302 Found/);
        assert.match(error.message, /redirect:/);
        assert.equal(error.message.includes("smoke-signature"), false);
        return true;
      },
    );
  });
});

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
  });
}
