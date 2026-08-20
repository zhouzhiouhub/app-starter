import assert from "node:assert/strict";
import test from "node:test";
import {
  readStorefrontRevalidationTimeoutMs,
  resolveStorefrontRevalidateUrl,
  triggerStorefrontRevalidation,
} from "../dist/modules/pages/pages.revalidation.js";

test("storefront revalidation skips when secret is missing", async () => {
  await withEnv(
    {
      STOREFRONT_REVALIDATE_SECRET: "",
      STOREFRONT_REVALIDATE_URL: "https://web.example.com/api/revalidate",
      WEB_URL: "",
    },
    async () => {
      const result = await triggerStorefrontRevalidation(
        {
          locale: "en-US",
          market: "us",
          slug: "home",
        },
        async () => {
          throw new Error("fetch should not be called");
        },
      );

      assert.equal(result.triggered, false);
      assert.equal(result.reason, "missing-secret");
      assert.deepEqual(result.paths, ["/", "/en"]);
    },
  );
});

test("storefront revalidation posts the page payload with secret header", async () => {
  await withEnv(
    {
      STOREFRONT_REVALIDATE_SECRET: "secret-1",
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/",
    },
    async () => {
      const calls = [];
      const result = await triggerStorefrontRevalidation(
        {
          locale: "en-US",
          market: "us",
          slug: "contact",
        },
        async (url, init) => {
          calls.push({ init, url });
          return { ok: true, status: 200 };
        },
      );

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
      assert.deepEqual(JSON.parse(calls[0].init.body), {
        locale: "en-US",
        market: "us",
        slug: "contact",
      });
    },
  );
});

test("storefront revalidation URL resolver normalizes safe URLs", () => {
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: " https://web.example.com/api/revalidate/ ",
      WEB_URL: "https://fallback.example.com/",
    }),
    "https://web.example.com/api/revalidate",
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/storefront/",
    }),
    "https://web.example.com/api/revalidate",
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: " https://web.example.com/ ",
      WEB_URL: "",
    }),
    "https://web.example.com/api/revalidate",
  );
});

test("storefront revalidation URL resolver rejects unsafe URLs", () => {
  for (const values of [
    {
      STOREFRONT_REVALIDATE_URL: "javascript:alert(1)",
      WEB_URL: "https://web.example.com/",
    },
    {
      STOREFRONT_REVALIDATE_URL:
        "https://user:pass@web.example.com/api/revalidate",
      WEB_URL: "",
    },
    {
      STOREFRONT_REVALIDATE_URL:
        "https://web.example.com/api/revalidate?secret=1",
      WEB_URL: "",
    },
    {
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "ftp://web.example.com",
    },
    {
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://user:pass@web.example.com",
    },
  ]) {
    assert.equal(resolveStorefrontRevalidateUrl(values), null);
  }
});

test("storefront revalidation skips unsafe URLs without fetching", async () => {
  await withEnv(
    {
      STOREFRONT_REVALIDATE_SECRET: "secret-1",
      STOREFRONT_REVALIDATE_URL:
        "https://user:pass@web.example.com/api/revalidate",
      WEB_URL: "",
    },
    async () => {
      const result = await triggerStorefrontRevalidation(
        {
          locale: "en-US",
          market: "us",
          slug: "contact",
        },
        async () => {
          throw new Error("fetch should not be called");
        },
      );

      assert.equal(result.triggered, false);
      assert.equal(result.reason, "missing-url");
    },
  );
});

test("storefront revalidation timeout config stays bounded", () => {
  assert.equal(
    readStorefrontRevalidationTimeoutMs({
      STOREFRONT_REVALIDATE_TIMEOUT_MS: " 15000 ",
    }),
    15000,
  );
  assert.equal(
    readStorefrontRevalidationTimeoutMs({
      STOREFRONT_REVALIDATE_TIMEOUT_MS: "30000",
    }),
    30000,
  );

  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "1e9",
    "30001",
    "Infinity",
    "later",
  ]) {
    assert.equal(
      readStorefrontRevalidationTimeoutMs({
        STOREFRONT_REVALIDATE_TIMEOUT_MS: value,
      }),
      5000,
    );
  }
});

test("storefront revalidation distinguishes timeouts from request failures", async () => {
  await withEnv(
    {
      STOREFRONT_REVALIDATE_SECRET: "secret-1",
      STOREFRONT_REVALIDATE_TIMEOUT_MS: "1",
      STOREFRONT_REVALIDATE_URL: "https://web.example.com/api/revalidate",
      WEB_URL: "",
    },
    async () => {
      const timeout = await triggerStorefrontRevalidation(
        {
          locale: "en-US",
          market: "us",
          slug: "contact",
        },
        async (_url, init) =>
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
          }),
      );

      const failure = await triggerStorefrontRevalidation(
        {
          locale: "en-US",
          market: "us",
          slug: "contact",
        },
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

async function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
