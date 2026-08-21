import assert from "node:assert/strict";
import test from "node:test";
import { triggerStorefrontRevalidation } from "../dist/modules/pages/pages.revalidation.js";
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

test("storefront revalidation posts the page payload with secret header", async () => {
  await withEnv(
    revalidationEnv({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/",
    }),
    async () => {
      const { calls, fetcher } = createRecordingFetch();
      const result = await triggerStorefrontRevalidation(pageInput(), fetcher);

      assert.equal(result.triggered, true);
      assert.deepEqual(result.paths, ["/en/contact"]);
      assert.deepEqual(result.tags, [
        "published-page",
        "published-page:us:en-US",
        "published-page:us:en-US:contact",
      ]);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://web.example.com/api/revalidate");
      assert.equal(calls[0].init.method, "POST");
      assert.equal(calls[0].init.headers["Content-Type"], "application/json");
      assert.equal(
        calls[0].init.headers["x-storefront-revalidate-secret"],
        "secret-1",
      );
      assert.deepEqual(JSON.parse(calls[0].init.body), pageInput());
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
      NODE_ENV: "production",
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
