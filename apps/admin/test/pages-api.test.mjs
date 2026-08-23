import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewToken } from "../src/features/pages/api.ts";

const validPreviewToken = `payload.${"a".repeat(43)}`;
const validPreviewTokenData = {
  expiresAt: "2026-08-23T00:15:00.000Z",
  slug: "campaign",
  token: validPreviewToken,
};

test("page preview token API accepts compact validated responses", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: validPreviewTokenData });
    },
    async () => {
      assert.deepEqual(
        await createPreviewToken("page 1?"),
        validPreviewTokenData,
      );
    },
  );

  assert.equal(
    requests[0].url,
    "/api/v1/pages/page%201%3F/preview-token",
  );
  assert.equal(requests[0].init.method, "POST");
  assert.match(
    requests[0].init.headers.get("Idempotency-Key"),
    /^[0-9a-f-]{36}$/,
  );
});

test("page preview token API rejects malformed responses", async () => {
  for (const data of [
    null,
    {},
    { ...validPreviewTokenData, expiresAt: "soon" },
    { ...validPreviewTokenData, expiresAt: " 2026-08-23T00:15:00.000Z " },
    { ...validPreviewTokenData, slug: "Campaign" },
    { ...validPreviewTokenData, token: "payload.signature" },
    { ...validPreviewTokenData, token: `payload.${"a".repeat(42)}` },
    { ...validPreviewTokenData, token: `${"a".repeat(2049)}.${"b".repeat(43)}` },
  ]) {
    await withFetch(
      async () => jsonResponse({ data }),
      async () => {
        await assert.rejects(
          () => createPreviewToken("page-1"),
          /Preview token could not be created/,
        );
      },
    );
  }
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

async function withFetch(fetchImplementation, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}
