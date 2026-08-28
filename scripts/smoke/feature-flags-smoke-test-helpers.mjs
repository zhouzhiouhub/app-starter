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
          code: "MULTI_LOCALE_DISABLED",
          message: "Translation import is limited to the default locale.",
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
            details: commerceReservedDetailDetails({
              resource: "product",
              surface: "public",
            }),
            message: "Public product pages are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (url.endsWith("/orders/smoke-order")) {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            details: commerceReservedDetailDetails({
              resource: "order",
              surface: "admin",
            }),
            message: "Order details are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (url.endsWith("/payments/smoke-payment")) {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            details: commerceReservedDetailDetails({
              resource: "payment",
              surface: "admin",
            }),
            message: "Payment details are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (url.endsWith("/products/smoke-product") && init.method === "GET") {
        return jsonResponse(
          {
            code: "NOT_FOUND",
            details: commerceReservedDetailDetails({
              resource: "product",
              surface: "admin",
            }),
            message: "Product details are reserved.",
          },
          { status: 404, statusText: "Not Found" },
        );
      }

      if (
        (url.endsWith("/products/smoke-product") && init.method === "PATCH") ||
        (url.endsWith("/products") && init.method === "POST")
      ) {
        const isCreate = url.endsWith("/products") && init.method === "POST";

        return jsonResponse(
          {
            code: "COMMERCE_DISABLED",
            details: commerceDisabledDetails({
              action: isCreate ? "create" : "update",
              resource: "product",
            }),
            message: "Product writes are reserved.",
          },
          { status: 409, statusText: "Conflict" },
        );
      }

      return jsonResponse(
        {
          code: "COMMERCE_DISABLED",
          details: commerceDisabledDetails(readPublicCommerceDisabledRoute(url)),
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

function commerceDisabledDetails(input) {
  return {
    action: input.action,
    commerceEnabled: false,
    reservedPhase: "phase-2",
    resource: input.resource,
    writable: false,
    writeDisabledCode: "COMMERCE_DISABLED",
  };
}

function commerceReservedDetailDetails(input) {
  return {
    action: "read",
    available: false,
    commerceEnabled: false,
    readUnavailableCode: "NOT_FOUND",
    reservedPhase: "phase-2",
    resource: input.resource,
    surface: input.surface,
    writable: false,
  };
}

function readPublicCommerceDisabledRoute(url) {
  if (url.endsWith("/public/cart")) {
    return { action: "add-to-cart", resource: "cart" };
  }

  if (url.endsWith("/public/checkout")) {
    return { action: "checkout", resource: "checkout" };
  }

  return { action: "receive-webhook", resource: "stripe-webhook" };
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
