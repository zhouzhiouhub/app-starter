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

test("runtime URL resolver fails fast on production API URL fallback", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        configuredUrl: "https://api.example.com/api/v1",
        deploymentEnv: "production",
        internalUrl: "http://localhost:4000/api/v1",
        publicUrl: "https://10.0.0.1/api/v1",
      }),
    {
      message:
        "API_URL or NEXT_PUBLIC_API_URL must be configured as a safe API URL in production.",
      name: "WebRuntimeUrlConfigurationError",
    },
  );
  assert.throws(
    () =>
      resolveApiBaseUrl({
        deploymentEnv: "production",
        internalUrl: "https://[::ffff:7f00:1]/api/v1",
      }),
    /API_URL or NEXT_PUBLIC_API_URL/,
  );
  assert.throws(
    () =>
      resolveApiBaseUrl({
        configuredUrl: "https://192.0.2.10/api/v1",
        deploymentEnv: "production",
        internalUrl: "https://100.64.0.10/api/v1",
        publicUrl: "https://198.18.0.10/api/v1",
      }),
    /API_URL or NEXT_PUBLIC_API_URL/,
  );
  assert.throws(
    () =>
      resolveApiBaseUrl({
        configuredUrl: "https://api.example/api/v1",
        deploymentEnv: "production",
      }),
    /API_URL or NEXT_PUBLIC_API_URL/,
  );
});

test("runtime URL resolver accepts production API URLs", () => {
  assert.equal(
    resolveApiBaseUrl({
      configuredUrl: "https://api.brand-platform.com/",
      deploymentEnv: "production",
    }),
    "https://api.brand-platform.com/api/v1",
  );
});

test("runtime URL resolver rejects production API URLs with surrounding whitespace", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        configuredUrl: " https://api.brand-platform.com/ ",
        deploymentEnv: "production",
      }),
    {
      message:
        "API_URL or NEXT_PUBLIC_API_URL must be configured as a safe API URL in production.",
      name: "WebRuntimeUrlConfigurationError",
    },
  );
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

test("runtime URL resolver rejects production Web origins with surrounding whitespace", () => {
  assert.throws(
    () =>
      resolveWebOrigin({
        deploymentEnv: "production",
        webUrl: " https://store.brand-platform.com/ ",
      }),
    {
      message:
        "WEB_URL or NEXT_PUBLIC_WEB_URL must be configured as a safe Web origin in production.",
      name: "WebRuntimeUrlConfigurationError",
    },
  );
});

test("runtime URL resolver fails fast on production Web URL fallback", () => {
  assert.throws(
    () =>
      resolveWebOrigin({
        deploymentEnv: "production",
        publicWebUrl: "https://[2001:db8::1]",
        webUrl: "http://localhost:3000",
      }),
    {
      message:
        "WEB_URL or NEXT_PUBLIC_WEB_URL must be configured as a safe Web origin in production.",
      name: "WebRuntimeUrlConfigurationError",
    },
  );
  assert.throws(
    () =>
      resolveWebOrigin({
        deploymentEnv: "production",
        publicWebUrl: "https://203.0.113.10",
        webUrl: "https://[::ffff:c000:020a]",
      }),
    /WEB_URL or NEXT_PUBLIC_WEB_URL/,
  );
  assert.throws(
    () =>
      resolveWebOrigin({
        deploymentEnv: "production",
        webUrl: "https://store.example",
      }),
    /WEB_URL or NEXT_PUBLIC_WEB_URL/,
  );
});

test("runtime URL resolver accepts production Web origins", () => {
  assert.equal(
    resolveWebOrigin({
      deploymentEnv: "production",
      webUrl: "https://store.brand-platform.com/",
    }),
    "https://store.brand-platform.com",
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
