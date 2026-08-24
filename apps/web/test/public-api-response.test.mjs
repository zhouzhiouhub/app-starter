import assert from "node:assert/strict";
import test from "node:test";
import { readPublicApiJson } from "../src/lib/public-api-response.ts";

test("public API response reader parses JSON responses", async () => {
  const result = await readPublicApiJson(
    new Response(JSON.stringify({ data: { slug: "home" } }), { status: 200 }),
  );

  assert.deepEqual(result, { data: { slug: "home" } });
});

test("public API response reader ignores non-JSON responses", async () => {
  const result = await readPublicApiJson(
    new Response("<html>Gateway error</html>", { status: 502 }),
  );

  assert.equal(result, null);
});

test("public API response reader rejects oversized content lengths", async () => {
  const result = await readPublicApiJson(
    new Response("{}", {
      headers: { "Content-Length": "1000001" },
      status: 200,
    }),
  );

  assert.equal(result, null);
});

test("public API response reader rejects oversized bodies without length headers", async () => {
  const result = await readPublicApiJson(
    new Response("x".repeat(1_000_001), { status: 200 }),
  );

  assert.equal(result, null);
});

test("public API response reader supports lightweight JSON mocks", async () => {
  const result = await readPublicApiJson({
    ok: true,
    async json() {
      return { data: { slug: "home" } };
    },
  });

  assert.deepEqual(result, { data: { slug: "home" } });
});
