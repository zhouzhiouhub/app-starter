import assert from "node:assert/strict";
import test from "node:test";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("JSON smoke fetch records redacted redirect locations", async () => {
  const calls = [];

  await withFetch(
    async (url, init = {}) => {
      calls.push({ init, url });

      return {
        headers: new Headers({
          location:
            "https://api.example.com/login?password=ChangeMe123!&token=header.payload.signature",
        }),
        ok: false,
        status: 302,
        statusText: "Found",
        async text() {
          throw new Error("redirect response bodies should not be read");
        },
      };
    },
    async () => {
      const response = await fetchJson(
        "https://api.example.com/api/v1/auth/login",
        {
          method: "POST",
        },
      );

      assert.equal(calls[0].init.redirect, "manual");
      assert.equal(response.redirectLocation.includes("ChangeMe123!"), false);
      assert.equal(
        response.redirectLocation.includes("header.payload.signature"),
        false,
      );
      assert.equal(
        response.redirectLocation,
        "https://api.example.com/login?password=[redacted]&token=[redacted]",
      );
      assert.equal(
        readHttpError(response, "Login request failed."),
        "Login request failed. 302: Found redirect: https://api.example.com/login?password=[redacted]&token=[redacted]",
      );
    },
  );
});

test("JSON smoke fetch rejects oversized content lengths before reading", async () => {
  let bodyCanceled = false;

  await withFetch(
    async () => ({
      body: {
        cancel() {
          bodyCanceled = true;
        },
      },
      headers: new Headers({ "Content-Length": "1000001" }),
      ok: true,
      status: 200,
      statusText: "OK",
      async text() {
        throw new Error("oversized bodies should not be read");
      },
    }),
    async () => {
      await assert.rejects(
        fetchJson("https://api.example.com/api/v1/public/config?token=secret"),
        (error) =>
          error instanceof Error &&
          error.message ===
            "https://api.example.com/api/v1/public/config?token=[redacted] returned a JSON response body larger than 1000000 bytes.",
      );
    },
  );

  assert.equal(bodyCanceled, true);
});

test("JSON smoke fetch rejects oversized bodies before parsing", async () => {
  await withFetch(
    async () =>
      new Response("x".repeat(1_000_001), {
        status: 200,
        statusText: "OK",
      }),
    async () => {
      await assert.rejects(
        fetchJson("https://api.example.com/api/v1/public/config"),
        /returned a JSON response body larger than 1000000 bytes/,
      );
    },
  );
});

test("JSON smoke fetch redacts non-JSON response snippets", async () => {
  await withFetch(
    async () =>
      new Response(
        "<html><body>token=header.payload.signature</body></html>",
        {
          status: 502,
          statusText: "Bad Gateway",
        },
      ),
    async () => {
      await assert.rejects(
        fetchJson("https://api.example.com/api/v1/public/config"),
        (error) =>
          error instanceof Error &&
          !error.message.includes("header.payload.signature") &&
          error.message.includes("token=[redacted]"),
      );
    },
  );
});
