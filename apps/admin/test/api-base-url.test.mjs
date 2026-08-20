import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "../src/lib/api-base-url.ts";

test("API base URL resolver keeps the dev proxy path", () => {
  assert.equal(
    resolveApiBaseUrl({
      configured: "https://api.example.com/api/v1",
      isDev: true,
    }),
    "/api/v1",
  );
});

test("API base URL resolver accepts safe configured bases", () => {
  assert.equal(
    resolveApiBaseUrl({
      configured: " https://api.example.com/api/v1/ ",
    }),
    "https://api.example.com/api/v1",
  );
  assert.equal(
    resolveApiBaseUrl({
      configured: "http://localhost:4000/api/v1//",
    }),
    "http://localhost:4000/api/v1",
  );
  assert.equal(
    resolveApiBaseUrl({
      configured: "/api/v1/",
    }),
    "/api/v1",
  );
});

test("API base URL resolver falls back to generic API_URL bases", () => {
  assert.equal(
    resolveApiBaseUrl({
      configured: "javascript:alert(1)",
      fallbackConfigured: " https://api.example.com/api/v1/ ",
    }),
    "https://api.example.com/api/v1",
  );
});

test("API base URL resolver rejects unsafe configured bases", () => {
  for (const configured of [
    "javascript:alert(1)",
    "ftp://api.example.com/api/v1",
    "https://user:password@api.example.com/api/v1",
    "//api.example.com/api/v1",
    "https://api.example.com/api/v1?tenant=1",
    "https://api.example.com/api/v1#admin",
    "api.example.com/api/v1",
  ]) {
    assert.equal(
      resolveApiBaseUrl({
        configured,
        fallbackConfigured: "https://api.example.com/api/v1?tenant=1",
      }),
      "/api/v1",
    );
  }
});

test("API base URL resolver falls back when not configured", () => {
  assert.equal(resolveApiBaseUrl({ configured: "   " }), "/api/v1");
  assert.equal(resolveApiBaseUrl({}), "/api/v1");
});
