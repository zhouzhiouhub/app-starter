import assert from "node:assert/strict";
import test from "node:test";
import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("JSON smoke fetch records redacted redirect locations", async () => {
  await withFetch(
    async () =>
      new Response("", {
        headers: {
          location:
            "https://api.example.com/login?password=ChangeMe123!&token=header.payload.signature",
        },
        status: 302,
        statusText: "Found",
      }),
    async () => {
      const response = await fetchJson("https://api.example.com/api/v1/auth/login", {
        method: "POST",
        redirect: "manual",
      });

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
