import assert from "node:assert/strict";
import test from "node:test";
import {
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
