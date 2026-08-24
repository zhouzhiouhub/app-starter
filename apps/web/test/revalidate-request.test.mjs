import assert from "node:assert/strict";
import test from "node:test";
import {
  parseRevalidatePayload,
  readRevalidateDefaults,
  readRevalidatePayload,
} from "../src/lib/revalidate-request.ts";

const defaults = {
  fallbackLocale: "en-US",
  locale: "en-US",
  market: "us",
};

test("revalidate payload builds page paths and tags", () => {
  const result = parseRevalidatePayload(
    {
      locale: "en-US",
      market: "us",
      slug: "contact",
    },
    defaults,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.input, {
    locale: "en-US",
    market: "us",
    slug: "contact",
  });
  assert.deepEqual(result.paths, ["/en/contact"]);
  assert.deepEqual(result.tags, [
    "published-page",
    "published-page:us:en-US",
    "published-page:us:en-US:contact",
    "public-translation",
    "public-translation:en-US",
  ]);
});

test("revalidate payload defaults locale and market", () => {
  const result = parseRevalidatePayload(
    {
      slug: "home",
    },
    defaults,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.input, {
    locale: "en-US",
    market: "us",
    slug: "home",
  });
  assert.deepEqual(result.paths, ["/", "/en"]);
});

test("revalidate payload includes fallback locale cache tags", () => {
  const result = parseRevalidatePayload(
    {
      locale: "de-DE",
      market: "us",
      slug: "contact",
    },
    defaults,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.paths, ["/de/contact"]);
  assert.deepEqual(result.tags, [
    "published-page",
    "published-page:us:de-DE",
    "published-page:us:de-DE:contact",
    "published-page:us:en-US",
    "published-page:us:en-US:contact",
    "public-translation",
    "public-translation:de-DE",
    "public-translation:en-US",
  ]);
});

test("revalidate payload accepts safe site hosts for scoped tags", () => {
  const result = parseRevalidatePayload(
    {
      locale: "en-US",
      market: "us",
      siteHost: "Store.Brand-Platform.com:443",
      slug: "contact",
    },
    defaults,
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.input, {
    locale: "en-US",
    market: "us",
    siteHost: "store.brand-platform.com",
    slug: "contact",
  });
  assert.equal(result.tags.length, 5);
  assert.match(result.tags[0], /^published-page:site:[a-z0-9]+$/);
  assert.equal(result.tags[1], `${result.tags[0]}:us:en-US`);
  assert.equal(result.tags[2], `${result.tags[0]}:us:en-US:contact`);
  assert.match(result.tags[3], /^public-translation:site:[a-z0-9]+$/);
  assert.equal(result.tags[4], `${result.tags[3]}:en-US`);
});

test("revalidate payload rejects unsafe site hosts", () => {
  const result = parseRevalidatePayload(
    {
      locale: "en-US",
      market: "us",
      siteHost: "store.example.com",
      slug: "contact",
    },
    defaults,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.details.reason, "invalid-fields");
  assert.deepEqual(result.error.details.fields, ["siteHost"]);
});

test("revalidate defaults ignore invalid environment values", () => {
  assert.deepEqual(
    readRevalidateDefaults({
      DEFAULT_LOCALE: "bad_locale",
      FALLBACK_LOCALE: "bad_fallback",
      DEFAULT_MARKET: "US",
    }),
    defaults,
  );
});

test("revalidate payload reports invalid JSON", async () => {
  const result = await readRevalidatePayload(
    {
      async json() {
        throw new SyntaxError("bad json");
      },
    },
    defaults,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "VALIDATION_ERROR");
  assert.equal(result.error.details.reason, "invalid-json");
  assert.deepEqual(result.error.details.fields, ["body"]);
});

test("revalidate payload reports invalid fields", () => {
  const result = parseRevalidatePayload(
    {
      locale: "english",
      market: "US",
      siteHost: {},
      slug: "Contact",
    },
    defaults,
  );

  assert.equal(result.ok, false);
  assert.equal(result.error.details.reason, "invalid-fields");
  assert.deepEqual(result.error.details.fields, [
    "slug",
    "locale",
    "market",
    "siteHost",
  ]);
  assert.deepEqual(result.error.details.defaults, defaults);
});

test("revalidate payload rejects non-object bodies", () => {
  const result = parseRevalidatePayload(null, defaults);

  assert.equal(result.ok, false);
  assert.equal(result.error.details.reason, "invalid-body");
  assert.deepEqual(result.error.details.fields, ["body"]);
});
