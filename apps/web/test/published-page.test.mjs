import assert from "node:assert/strict";
import test from "node:test";
import { getPublishedPage } from "../src/lib/published-page.ts";

test("published page lookup rejects invalid explicit locale before fetching", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return {
        ok: false,
        async json() {
          return {};
        },
      };
    },
    async () => {
      assert.equal(
        await getPublishedPage({
          locale: "bad_locale",
          slug: "home",
        }),
        null,
      );
    },
  );

  assert.deepEqual(requests, []);
});

async function withFetch(fetchImplementation, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await fn();
  } finally {
    globalThis.fetch = previous;
  }
}
