import assert from "node:assert/strict";
import test from "node:test";
import {
  createStorefrontRevalidationInput,
  triggerStorefrontRevalidation,
} from "../dist/modules/pages/pages.revalidation.js";
import { createStorefrontRevalidationHeaders } from "../dist/modules/pages/pages.revalidation-request.js";
import { withEnv } from "./env-helper.mjs";

const defaultPageInput = {
  locale: "en-US",
  market: "us",
  slug: "contact",
};

const defaultRevalidationEnv = {
  STOREFRONT_REVALIDATE_SECRET: "secret-1",
  STOREFRONT_REVALIDATE_URL: "https://web.example.com/api/revalidate",
  WEB_URL: "",
};

function pageInput(overrides = {}) {
  return { ...defaultPageInput, ...overrides };
}

function revalidationEnv(overrides = {}) {
  return { ...defaultRevalidationEnv, ...overrides };
}

function createRecordingFetch(response = { ok: true, status: 200 }) {
  const calls = [];

  return {
    calls,
    fetcher: async (url, init) => {
      calls.push({ init, url });
      return response;
    },
  };
}

async function rejectingFetch() {
  throw new Error("fetch should not be called");
}

function createAbortOnSignalFetch() {
  return async (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener(
        "abort",
        () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        },
        { once: true },
      );
    });
}

test("storefront revalidation skips when secret is missing", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_SECRET: "",
      STOREFRONT_REVALIDATE_URL: "https://web.example.com/api/revalidate",
    }),
    async () => {
      const result = await triggerStorefrontRevalidation(
        pageInput({ slug: "home" }),
        rejectingFetch,
      );

      assert.equal(result.triggered, false);
      assert.equal(result.reason, "missing-secret");
      assert.deepEqual(result.paths, ["/", "/en"]);
    },
  );
});

test("storefront revalidation skips unsafe secrets before fetching", async () => {
  for (const secret of [
    "secret-1\r\nx-secret: leaked",
    "a".repeat(1025),
  ]) {
    await withEnv(
      revalidationEnv({
        STOREFRONT_REVALIDATE_SECRET: secret,
      }),
      async () => {
        const result = await triggerStorefrontRevalidation(
          pageInput(),
          rejectingFetch,
        );

        assert.equal(result.triggered, false);
        assert.equal(result.reason, "missing-secret");
      },
    );
  }
});

test("storefront revalidation posts the page payload with secret header", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/",
    }),
    async () => {
      const { calls, fetcher } = createRecordingFetch();
      const result = await triggerStorefrontRevalidation(
        pageInput({ requestId: "request-publish-1" }),
        fetcher,
      );

      assert.equal(result.triggered, true);
      assert.deepEqual(result.paths, ["/en/contact"]);
      assert.deepEqual(result.tags, [
        "published-page",
        "published-page:us:en-US",
        "published-page:us:en-US:contact",
        "public-translation",
        "public-translation:en-US",
      ]);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://web.example.com/api/revalidate");
      assert.equal(calls[0].init.method, "POST");
      assert.equal(calls[0].init.redirect, "manual");
      assert.equal(calls[0].init.headers["Content-Type"], "application/json");
      assert.equal(
        calls[0].init.headers["x-storefront-revalidate-secret"],
        "secret-1",
      );
      assert.equal(calls[0].init.headers["X-Request-Id"], "request-publish-1");
      assert.deepEqual(JSON.parse(calls[0].init.body), pageInput());
    },
  );
});

test("storefront revalidation cancels response bodies after status checks", async () => {
  await withEnv(revalidationEnv(), async () => {
    const canceledStatuses = [];
    const success = await triggerStorefrontRevalidation(
      pageInput({ slug: "home" }),
      async () => createCancellableResponse(200, true, canceledStatuses),
    );
    const failure = await triggerStorefrontRevalidation(
      pageInput({ slug: "home" }),
      async () => createCancellableResponse(502, false, canceledStatuses),
    );

    assert.equal(success.triggered, true);
    assert.equal(failure.triggered, false);
    assert.equal(failure.reason, "request-failed");
    assert.equal(failure.status, 502);
    assert.deepEqual(canceledStatuses, [200, 502]);
  });
});

test("storefront revalidation headers forward only safe request ids", () => {
  assert.equal(
    createStorefrontRevalidationHeaders("secret-1", " request-publish-1 ")[
      "X-Request-Id"
    ],
    "request-publish-1",
  );
  assert.equal(
    "X-Request-Id" in
      createStorefrontRevalidationHeaders(
        "secret-1",
        "request-1\r\nx-secret: leaked",
      ),
    false,
  );
});

function createCancellableResponse(status, ok, canceledStatuses) {
  return {
    body: new ReadableStream({
      cancel() {
        canceledStatuses.push(status);
      },
    }),
    ok,
    status,
  };
}

test("storefront revalidation posts safe site hosts for scoped tags", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/",
    }),
    async () => {
      const { calls, fetcher } = createRecordingFetch();
      const result = await triggerStorefrontRevalidation(
        pageInput({ siteHost: "Store.Brand-Platform.com:443" }),
        fetcher,
      );

      assert.equal(result.triggered, true);
      assert.equal(result.tags.length, 5);
      assert.match(result.tags[0], /^published-page:site:[a-z0-9]+$/);
      assert.equal(result.tags[1], `${result.tags[0]}:us:en-US`);
      assert.equal(result.tags[2], `${result.tags[0]}:us:en-US:contact`);
      assert.match(result.tags[3], /^public-translation:site:[a-z0-9]+$/);
      assert.equal(result.tags[4], `${result.tags[3]}:en-US`);
      assert.deepEqual(JSON.parse(calls[0].init.body), {
        ...pageInput(),
        siteHost: "store.brand-platform.com",
      });
    },
  );
});

test("storefront revalidation skips invalid site hosts before fetching", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/",
    }),
    async () => {
      const result = await triggerStorefrontRevalidation(
        pageInput({ siteHost: "store.example.com" }),
        rejectingFetch,
      );

      assert.equal(result.triggered, false);
      assert.equal(result.reason, "invalid-site-host");
      assert.deepEqual(result.paths, ["/en/contact"]);
      assert.deepEqual(result.tags, []);
    },
  );
});

test("storefront revalidation input includes runtime fallback context", async () => {
  await withEnv(
    {
      DEFAULT_MARKET: "ca",
      FALLBACK_LOCALE: "fr-FR",
    },
    async () => {
      const input = createStorefrontRevalidationInput(
        {
          meta: {
            locale: "de-DE",
            market: "eu",
            slug: "contact",
          },
        },
        null,
        "request-publish-2",
      );

      assert.deepEqual(input, {
        fallbackLocale: "fr-FR",
        fallbackMarket: "ca",
        locale: "de-DE",
        market: "eu",
        requestId: "request-publish-2",
        slug: "contact",
      });
    },
  );
});

test("storefront revalidation reports fallback cache tags without posting them", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/",
    }),
    async () => {
      const { calls, fetcher } = createRecordingFetch();
      const result = await triggerStorefrontRevalidation(
        pageInput({
          fallbackLocale: "en-US",
          fallbackMarket: "us",
          locale: "de-DE",
          market: "eu",
        }),
        fetcher,
      );

      assert.equal(result.triggered, true);
      assert.deepEqual(result.paths, ["/de/contact"]);
      assert.deepEqual(result.tags, [
        "published-page",
        "published-page:eu:de-DE",
        "published-page:eu:de-DE:contact",
        "published-page:us:en-US",
        "published-page:us:en-US:contact",
        "public-translation",
        "public-translation:de-DE",
        "public-translation:en-US",
      ]);
      assert.deepEqual(JSON.parse(calls[0].init.body), {
        locale: "de-DE",
        market: "eu",
        slug: "contact",
      });
    },
  );
});

test("storefront revalidation skips unsafe URLs without fetching", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_URL:
        "https://user:pass@web.example.com/api/revalidate",
    }),
    async () => {
      const result = await triggerStorefrontRevalidation(
        pageInput(),
        rejectingFetch,
      );

      assert.equal(result.triggered, false);
      assert.equal(result.reason, "missing-url");
    },
  );
});

test("storefront revalidation skips unsafe production URLs without fetching", async () => {
  await withEnv(
    revalidationEnv({
      APP_ENV: "production",
      STOREFRONT_REVALIDATE_URL:
        "http://store.brand-platform.com/api/revalidate",
      WEB_URL: "",
    }),
    async () => {
      const result = await triggerStorefrontRevalidation(
        pageInput(),
        rejectingFetch,
      );

      assert.equal(result.triggered, false);
      assert.equal(result.reason, "missing-url");
    },
  );
});

test("storefront revalidation distinguishes timeouts from request failures", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_TIMEOUT_MS: "1",
    }),
    async () => {
      const timeout = await triggerStorefrontRevalidation(
        pageInput(),
        createAbortOnSignalFetch(),
      );

      const failure = await triggerStorefrontRevalidation(
        pageInput(),
        async () => {
          throw new Error("network failed");
        },
      );

      assert.equal(timeout.triggered, false);
      assert.equal(timeout.reason, "request-timeout");
      assert.equal(failure.triggered, false);
      assert.equal(failure.reason, "request-failed");
    },
  );
});
