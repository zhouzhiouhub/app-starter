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

    if (url.endsWith("/translations/import")) {
      return jsonResponse(
        {
          code: "CONFLICT",
          message: "Translation import is reserved.",
        },
        { status: 409, statusText: "Conflict" },
      );
    }

    if (url.endsWith("/translations/export")) {
      return jsonResponse({
        data: {
          contentType: "application/json",
          entries: [],
          entryCount: 0,
          expectedKeyCount: 0,
          exportVersion: "translation-export.v1",
          filename: "translations-en-US.json",
          format: "json",
          locale: "en-US",
          missingKeyCount: 0,
          missingKeyPreviewLimit: 50,
          missingKeys: [],
        },
        meta: {
          fallbackLocale: "en-US",
          isFallback: true,
          locale: "en-US",
          preview: false,
        },
      });
    }

    if (
      (!init.method || init.method === "GET") &&
      (url.endsWith("/products") ||
        url.endsWith("/products/smoke-product/variants") ||
        url.endsWith("/products/smoke-product/prices") ||
        url.endsWith("/products/smoke-product/inventory") ||
        url.endsWith("/orders") ||
        url.endsWith("/payments"))
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
      url.endsWith("/products/smoke-product") ||
      url.endsWith("/orders/smoke-order") ||
      url.endsWith("/payments/smoke-payment") ||
      (url.endsWith("/products") && init.method === "POST") ||
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

      if (url.endsWith("/orders/smoke-order")) {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            message: "Order details are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (url.endsWith("/payments/smoke-payment")) {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            message: "Payment details are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (url.endsWith("/products/smoke-product") && init.method === "GET") {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            message: "Product details are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (
        (url.endsWith("/products/smoke-product") && init.method === "PATCH") ||
        (url.endsWith("/products") && init.method === "POST")
      ) {
        return jsonResponse(
          {
            code: "COMMERCE_DISABLED",
            message: "Product writes are reserved.",
          },
          { status: 409, statusText: "Conflict" },
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

    if (url.endsWith("/locales/de-DE") && init.method === "PATCH") {
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
