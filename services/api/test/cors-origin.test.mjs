import assert from "node:assert/strict";
import test from "node:test";
import {
  createCorsOriginResolver,
  isAllowedCorsOrigin,
  isAllowedDevOrigin,
  isProductionCorsEnvironment,
  readConfiguredCorsOrigins,
} from "../dist/common/cors-origin.js";

test("CORS origin config uses local defaults when unset", () => {
  assert.deepEqual(readConfiguredCorsOrigins({}), [
    "http://localhost:3000",
    "http://localhost:5173",
  ]);
});

test("CORS origin config does not use local defaults in production", () => {
  assert.deepEqual(readConfiguredCorsOrigins({ NODE_ENV: "production" }), []);
  assert.deepEqual(
    readConfiguredCorsOrigins({
      NODE_ENV: "production",
      WEB_URL: "https://store.brand-platform.com/",
    }),
    ["https://store.brand-platform.com"],
  );
});

test("CORS origin config treats deployment production markers as production", () => {
  assert.equal(isProductionCorsEnvironment({ APP_ENV: " production " }), true);
  assert.equal(isProductionCorsEnvironment({ VERCEL_ENV: "production" }), true);
  assert.equal(isProductionCorsEnvironment({ NODE_ENV: "development" }), false);
  assert.deepEqual(readConfiguredCorsOrigins({ APP_ENV: "production" }), []);
  assert.deepEqual(
    readConfiguredCorsOrigins({
      ADMIN_URL: "http://localhost:5173",
      APP_ENV: "production",
      WEB_URL: "https://store.brand-platform.com",
    }),
    ["https://store.brand-platform.com"],
  );
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

test("CORS origin config rejects unsafe production origins", () => {
  assert.deepEqual(
    readConfiguredCorsOrigins({
      ADMIN_URL: "https://admin.brand-platform.com/settings",
      NODE_ENV: "production",
      WEB_URL: "http://store.brand-platform.com",
    }),
    [],
  );
  assert.deepEqual(
    readConfiguredCorsOrigins({
      ADMIN_URL: "https://192.0.2.10",
      NODE_ENV: "production",
      WEB_URL: "https://localhost:3000",
    }),
    [],
  );
  assert.deepEqual(
    readConfiguredCorsOrigins({
      ADMIN_URL: "https://admin.example.com",
      NODE_ENV: "production",
      WEB_URL: "https://[::ffff:c000:020a]",
    }),
    [],
  );
  assert.deepEqual(
    readConfiguredCorsOrigins({
      NODE_ENV: "production",
      WEB_URL: "https://store.example",
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

test("CORS origin resolver denies without echoing unsafe origins", () => {
  const resolver = createCorsOriginResolver({
    configuredOrigins: ["https://web.example.com"],
    isProduction: true,
  });
  let deniedError = null;

  resolver("https://attacker.example.com\r\nx-secret: leaked", (error) => {
    deniedError = error;
  });

  assert.equal(deniedError?.message, "CORS origin denied.");
  assert.equal(deniedError?.message.includes("attacker"), false);
  assert.equal(deniedError?.message.includes("x-secret"), false);
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
