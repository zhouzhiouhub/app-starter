import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl, resolveWebOrigin } from "../src/lib/runtime-url.ts";

test("runtime URL resolver prefers safe internal API bases", () => {
  assert.equal(
    resolveApiBaseUrl({
      internalUrl: " https://internal.example.com/ ",
      publicUrl: "https://public.example.com/api/v1",
    }),
    "https://internal.example.com/api/v1",
  );
});

test("runtime URL resolver falls back from unsafe internal API bases", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredUrl: " https://api.example.com/api/v1/ ",
      internalUrl: "javascript:alert(1)",
      publicUrl: "https://public.example.com/api/v1/",
    }),
    "https://api.example.com/api/v1",
  );
});

test("runtime URL resolver uses public API bases after unsafe server bases", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredUrl: "api.example.com/api/v1",
      internalUrl: "javascript:alert(1)",
      publicUrl: "https://public.example.com/api/v1/",
    }),
    "https://public.example.com/api/v1",
  );
});

test("runtime URL resolver rejects unsafe API bases", () => {
  for (const internalUrl of [
    "ftp://api.example.com/api/v1",
    "https://user:password@api.example.com/api/v1",
    "https://api.example.com/api/v1?tenant=1",
    "https://api.example.com/api/v1#admin",
    "https://api.example.com/admin",
    "/api/v1",
    "api.example.com/api/v1",
  ]) {
    assert.equal(
      resolveApiBaseUrl({ internalUrl }),
      "http://localhost:4000/api/v1",
    );
  }
});

test("runtime URL resolver accepts safe web origins", () => {
  assert.equal(
    resolveWebOrigin({
      publicWebUrl: "https://public.example.com/",
      webUrl: " https://web.example.com/ ",
    }),
    "https://web.example.com",
  );
});

test("runtime URL resolver falls back from unsafe web origins", () => {
  assert.equal(
    resolveWebOrigin({
      publicWebUrl: "https://public.example.com/",
      webUrl: "https://user:password@web.example.com",
    }),
    "https://public.example.com",
  );
  assert.equal(
    resolveWebOrigin({
      publicWebUrl: "javascript:alert(1)",
      webUrl: "ftp://web.example.com",
    }),
    "http://localhost:3000",
  );
  assert.equal(
    resolveWebOrigin({
      publicWebUrl: "https://public.example.com/",
      webUrl: "https://web.example.com/storefront/",
    }),
    "https://public.example.com",
  );
});
