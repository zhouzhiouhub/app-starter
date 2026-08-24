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

test("feature flag smoke checks disabled feature placeholders", async () => {
  const calls = [];

  await withFetch(createFeatureFlagSmokeFetch({ calls }), async () => {
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

  for (const suffix of [
    "/markets",
    "/locales",
    "/translations?locale=de-DE",
    "/products",
    "/orders",
    "/payments",
  ]) {
    const call = calls.find((candidate) => candidate.url.endsWith(suffix));

    assert.ok(call);
    assert.equal(call.init.redirect, "manual");
    assert.equal(call.init.headers.Authorization, "Bearer access-token");
  }
});

test("feature flag smoke rejects redirected stripe webhook checks safely", async () => {
  await withFetch(createFeatureFlagSmokeFetch({
    overrides: {
      "/webhooks/stripe": () =>
        new Response("", {
          headers: {
            Location:
              "https://api.example.com/login?signature=smoke-signature",
          },
          status: 302,
          statusText: "Found",
        }),
    },
  }), async () => {
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

test("feature flag smoke rejects non-empty commerce placeholders", async () => {
  await withFetch(createFeatureFlagSmokeFetch({
    overrides: {
      "/products": () =>
        jsonResponse({
          data: [{ id: "product-should-not-exist" }],
        }),
    },
  }), async () => {
    await assert.rejects(
      () =>
        assertFeatureFlagsDisabled(
          {
            apiBaseUrl: "https://api.example.com/api/v1",
          },
          "access-token",
        ),
      /Products placeholder expected an empty data array\./,
    );
  });
});

test("feature flag smoke rejects localization placeholder drift", async () => {
  await withFetch(createFeatureFlagSmokeFetch({
    overrides: {
      "/translations?locale=de-DE": () =>
        jsonResponse({
          data: [],
          meta: {
            fallbackLocale: "en-US",
            isFallback: false,
            locale: "de-DE",
          },
        }),
    },
  }), async () => {
    await assert.rejects(
      () =>
        assertFeatureFlagsDisabled(
          {
            apiBaseUrl: "https://api.example.com/api/v1",
          },
          "access-token",
        ),
      /Translations placeholder did not fall back to the default locale\./,
    );
  });
});

function createFeatureFlagSmokeFetch(options = {}) {
  return async (url, init = {}) => {
    options.calls?.push({ init, url });

    const override = readRouteHandler(url, options.overrides ?? {});

    if (override) {
      return override(url, init);
    }

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

    if (url.endsWith("/markets")) {
      return jsonResponse({
        data: [
          {
            code: "us",
            currency: "USD",
            defaultLocale: "en-US",
            status: "active",
          },
        ],
      });
    }

    if (url.endsWith("/locales") && init.method !== "POST") {
      return jsonResponse({
        data: [
          {
            code: "en-US",
            fallbackLocale: "en-US",
            status: "active",
          },
        ],
      });
    }

    if (url.endsWith("/translations?locale=de-DE")) {
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
      url.endsWith("/products") ||
      url.endsWith("/orders") ||
      url.endsWith("/payments")
    ) {
      return jsonResponse({ data: [] });
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

    if (url.endsWith("/locales") && init.method === "POST") {
      return jsonResponse(
        {
          code: "MULTI_LOCALE_DISABLED",
          message: "Multi-locale is disabled.",
        },
        { status: 409, statusText: "Conflict" },
      );
    }

    return jsonResponse({}, { status: 404, statusText: "Not Found" });
  };
}

function readRouteHandler(url, handlers) {
  return Object.entries(handlers).find(([suffix]) =>
    url.endsWith(suffix),
  )?.[1];
}

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
