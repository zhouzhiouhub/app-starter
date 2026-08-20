import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import {
  getPreviewPage,
  getPublishedPage,
} from "../src/lib/published-page.ts";

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

test("preview page lookup rejects malformed tokens before fetching", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({ data: createFallbackPage({ slug: "home" }) });
    },
    async () => {
      for (const token of [
        "",
        "payload.signature.extra",
        "payload.signature!",
        `payload.${"a".repeat(42)}`,
        `${"a".repeat(2049)}.${"b".repeat(43)}`,
        " payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ",
      ]) {
        assert.equal(await getPreviewPage(token), null);
      }
    },
  );

  assert.deepEqual(requests, []);
});

test("preview page lookup fetches only compact token candidates", async () => {
  const requests = [];
  const token = `payload.${"a".repeat(43)}`;

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({
        data: createFallbackPage({ slug: "campaign", title: "Campaign" }),
      });
    },
    async () => {
      const page = await getPreviewPage(token);

      assert.equal(page?.meta.slug, "campaign");
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/public\/preview\/payload\.a{43}$/);
  assert.deepEqual(requests[0].init, { cache: "no-store" });
});

function jsonResponse(data) {
  return {
    ok: true,
    async json() {
      return data;
    },
  };
}

async function withFetch(fetchImplementation, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await fn();
  } finally {
    globalThis.fetch = previous;
  }
}
