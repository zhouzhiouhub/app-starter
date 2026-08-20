import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSmokeBoolean, readConfig } from "./publish-smoke-config.mjs";

test("smoke config parses boolean flags from an explicit whitelist", () => {
  for (const value of ["1", "true", "TRUE", "yes", "on"]) {
    assert.equal(normalizeSmokeBoolean(value, "SMOKE_FLAG"), true);
  }

  for (const value of ["0", "false", "FALSE", "no", "off"]) {
    assert.equal(normalizeSmokeBoolean(value, "SMOKE_FLAG"), false);
  }

  assert.throws(
    () => normalizeSmokeBoolean("treu", "SMOKE_FLAG"),
    /SMOKE_FLAG must be true or false/,
  );
});

test("smoke config rejects misspelled boolean environment values", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_REVALIDATION: "treu",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REQUIRE_REVALIDATION must be true or false/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REQUIRE_R2_UPLOAD: "maybe",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REQUIRE_R2_UPLOAD must be true or false/,
      );
    },
  );
});

async function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await fn();
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
