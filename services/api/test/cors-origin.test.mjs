import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedCorsOrigin,
  isAllowedDevOrigin,
  readConfiguredCorsOrigins,
} from "../dist/common/cors-origin.js";

test("CORS origin config uses local defaults when unset", () => {
  assert.deepEqual(readConfiguredCorsOrigins({}), [
    "http://localhost:3000",
    "http://localhost:5173",
  ]);
});

test("CORS origin config normalizes configured URL origins", () => {
  assert.deepEqual(
    readConfiguredCorsOrigins({
      ADMIN_URL: "https://admin.example.com/",
      WEB_URL: " https://web.example.com/storefront/ ",
    }),
    ["https://web.example.com", "https://admin.example.com"],
  );
});

test("CORS origin config rejects unsafe configured origins", () => {
  assert.deepEqual(
    readConfiguredCorsOrigins({
      ADMIN_URL: "javascript:alert(1)",
      WEB_URL: "https://user:password@web.example.com",
    }),
    [],
  );
});

test("CORS origin matcher allows configured and server-side requests", () => {
  const configuredOrigins = ["https://web.example.com"];

  assert.equal(
    isAllowedCorsOrigin({
      configuredOrigins,
      isProduction: true,
      origin: undefined,
    }),
    true,
  );
  assert.equal(
    isAllowedCorsOrigin({
      configuredOrigins,
      isProduction: true,
      origin: "https://web.example.com",
    }),
    true,
  );
});

test("CORS origin matcher limits dev-only private origins", () => {
  const configuredOrigins = ["https://web.example.com"];

  assert.equal(
    isAllowedCorsOrigin({
      configuredOrigins,
      isProduction: false,
      origin: "http://192.168.1.20:5173",
    }),
    true,
  );
  assert.equal(
    isAllowedCorsOrigin({
      configuredOrigins,
      isProduction: false,
      origin: "http://[::1]:5173",
    }),
    true,
  );
  assert.equal(
    isAllowedCorsOrigin({
      configuredOrigins,
      isProduction: true,
      origin: "http://192.168.1.20:5173",
    }),
    false,
  );
  assert.equal(
    isAllowedCorsOrigin({
      configuredOrigins,
      isProduction: false,
      origin: "https://public.example.net",
    }),
    false,
  );
});

test("CORS dev origin helper rejects unsafe origins", () => {
  assert.equal(isAllowedDevOrigin("file:///tmp/app"), false);
  assert.equal(isAllowedDevOrigin("https://user:pass@localhost:5173"), false);
  assert.equal(isAllowedDevOrigin("not a url"), false);
});
