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

test("API response reader rejects oversized successful bodies", async () => {
  await assert.rejects(
    readApiResponseJson(
      new Response("{}", {
        headers: { "Content-Length": "1000001" },
        status: 200,
      }),
      "Request failed.",
    ),
    (error) =>
      error instanceof ApiRequestError &&
      error.code === "RESPONSE_BODY_TOO_LARGE" &&
      error.message === "API response body is too large to process.",
  );
});

test("API response reader redacts secrets from plain text errors", async () => {
  await assert.rejects(
    readApiResponseJson(
      new Response(
        "Proxy failed Authorization: Bearer header.payload.signature https://uploads.example.com/object?X-Amz-Signature=signed-value#access_token=fragment-token",
        { status: 502 },
      ),
      "Request failed.",
    ),
    (error) =>
      error instanceof ApiRequestError &&
      error.message.includes("header.payload.signature") === false &&
      error.message.includes("signed-value") === false &&
      error.message.includes("fragment-token") === false &&
      error.message.includes("Authorization: Bearer [redacted]") &&
      error.message.includes("X-Amz-Signature=[redacted]") &&
      Boolean(error.message.includes("#access_token=[redacted]")),
  );
});

test("response body reader avoids surfacing HTML error documents", async () => {
  const result = await readResponseBody(
    new Response("<html><body>Gateway error</body></html>", { status: 502 }),
  );

  assert.deepEqual(result, { message: "Request failed (502)." });
});

test("response body reader reports oversized error bodies", async () => {
  const result = await readResponseBody(
    new Response("{}", {
      headers: { "Content-Length": "1000001" },
      status: 502,
    }),
  );

  assert.deepEqual(result, {
    error: {
      code: "RESPONSE_BODY_TOO_LARGE",
      message: "API response body is too large to process.",
    },
  });
});

test("response body reader reports oversized bodies without length headers", async () => {
  const result = await readResponseBody({
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(1_000_001)));
        controller.close();
      },
    }),
    headers: new Headers(),
    status: 502,
    async text() {
      throw new Error("streamed bodies should not call text");
    },
  });

  assert.deepEqual(result, {
    error: {
      code: "RESPONSE_BODY_TOO_LARGE",
      message: "API response body is too large to process.",
    },
  });
});
