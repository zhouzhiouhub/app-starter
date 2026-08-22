import assert from "node:assert/strict";
import test from "node:test";
import { ApiRequestError } from "../src/lib/api-error.ts";
import {
  readApiResponseJson,
  readResponseBody,
} from "../src/lib/api-response.ts";

test("API response reader parses successful JSON bodies", async () => {
  const result = await readApiResponseJson(
    new Response(JSON.stringify({ data: { id: "page-1" } }), { status: 200 }),
    "Page could not be loaded.",
  );

  assert.deepEqual(result, { data: { id: "page-1" } });
});

test("API response reader uses fallback for empty error bodies", async () => {
  await assert.rejects(
    readApiResponseJson(
      new Response("", { status: 502 }),
      "Media assets could not be loaded.",
    ),
    (error) =>
      error instanceof ApiRequestError &&
      error.message === "Media assets could not be loaded.",
  );
});

test("API response reader preserves plain text error bodies", async () => {
  await assert.rejects(
    readApiResponseJson(
      new Response("Upstream unavailable", { status: 503 }),
      "Request failed.",
    ),
    (error) =>
      error instanceof ApiRequestError &&
      error.message === "Upstream unavailable",
  );
});

test("response body reader avoids surfacing HTML error documents", async () => {
  const result = await readResponseBody(
    new Response("<html><body>Gateway error</body></html>", { status: 502 }),
  );

  assert.deepEqual(result, { message: "Request failed (502)." });
});
