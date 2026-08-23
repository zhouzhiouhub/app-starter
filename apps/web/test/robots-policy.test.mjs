import assert from "node:assert/strict";
import test from "node:test";
import { buildRobotsPolicy } from "../src/lib/robots-policy.ts";

test("robots policy allows safe storefront hosts with a scoped sitemap", () => {
  const robots = buildRobotsPolicy({
    storefrontHost: "Store.Brand-Platform.com:443",
  });

  assert.deepEqual(robots, {
    host: "https://store.brand-platform.com",
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: "https://store.brand-platform.com/sitemap.xml",
  });
});

test("robots policy falls back to the configured web origin without a host", () => {
  withEnv({ WEB_URL: "https://web.brand-platform.com" }, () => {
    const robots = buildRobotsPolicy();

    assert.equal(robots.host, "https://web.brand-platform.com");
    assert.equal(robots.sitemap, "https://web.brand-platform.com/sitemap.xml");
    assert.deepEqual(robots.rules, {
      allow: "/",
      userAgent: "*",
    });
  });
});

test("robots policy disallows unsafe explicit storefront hosts", () => {
  const robots = buildRobotsPolicy({
    storefrontHost: "store.example.com",
  });

  assert.deepEqual(robots, {
    rules: {
      disallow: "/",
      userAgent: "*",
    },
  });
});

function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
