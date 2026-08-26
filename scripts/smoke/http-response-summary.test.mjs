import assert from "node:assert/strict";
import test from "node:test";
import { readRedirectLocation } from "./http-response-summary.mjs";

test("smoke response summaries ignore non-redirect locations", () => {
  assert.equal(
    readRedirectLocation(createResponse(200, "https://a.test")),
    null,
  );
  assert.equal(
    readRedirectLocation(createResponse(404, "https://a.test")),
    null,
  );
  assert.equal(readRedirectLocation(createResponse(302, "")), null);
});

test("smoke response summaries bound redirect locations", () => {
  const location = readRedirectLocation(
    createResponse(
      302,
      ` https://web.example.com/login?token=payload.signature \u0000${"x".repeat(
        600,
      )} `,
    ),
  );

  assert.equal(location.length, 512);
  assert.equal(location.endsWith("..."), true);
  assert.equal(location.includes("\u0000"), false);
  assert.equal(location.includes("payload.signature"), false);
  assert.match(location, /token=\[redacted\]/);
});

function createResponse(status, location) {
  return {
    headers: {
      get(name) {
        return name.toLowerCase() === "location" ? location : null;
      },
    },
    status,
  };
}
