export function createFeatureFlagSmokeFetch(options = {}) {
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
      url.endsWith("/translations/import") ||
      url.endsWith("/translations/export")
    ) {
      return jsonResponse(
        {
          code: "CONFLICT",
          message: "Translation bulk operation is reserved.",
        },
        { status: 409, statusText: "Conflict" },
      );
    }

    if (
      url.endsWith("/products") ||
      url.endsWith("/orders") ||
      url.endsWith("/payments")
    ) {
      return jsonResponse({
        data: [],
        meta: {
          commerceEnabled: false,
          currency: "USD",
          market: "us",
          reservedPhase: "phase-2",
          resource: url.split("/").at(-1),
          total: 0,
          writeDisabledCode: "COMMERCE_DISABLED",
          writable: false,
        },
      });
    }

    if (
      url.endsWith("/public/products/smoke-product") ||
      url.endsWith("/public/cart") ||
      url.endsWith("/public/checkout") ||
      url.endsWith("/webhooks/stripe")
    ) {
      if (url.endsWith("/public/products/smoke-product")) {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            message: "Public product pages are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

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

export function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
  });
}

function readRouteHandler(url, handlers) {
  return Object.entries(handlers).find(([suffix]) => url.endsWith(suffix))?.[1];
}
