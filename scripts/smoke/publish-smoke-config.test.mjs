import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSmokeBoolean,
  normalizeSmokePositiveInt,
  normalizeSmokeReportPath,
  readConfig,
} from "./publish-smoke-config.mjs";

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

test("smoke config validates positive integer retry settings", () => {
  assert.equal(
    normalizeSmokePositiveInt(" 8 ", "SMOKE_RETRY_ATTEMPTS", {
      max: 60,
      min: 1,
    }),
    8,
  );
  assert.throws(
    () =>
      normalizeSmokePositiveInt("1.5", "SMOKE_RETRY_ATTEMPTS", {
        max: 60,
        min: 1,
      }),
    /SMOKE_RETRY_ATTEMPTS must be a positive integer/,
  );
  assert.throws(
    () =>
      normalizeSmokePositiveInt("0", "SMOKE_RETRY_ATTEMPTS", {
        max: 60,
        min: 1,
      }),
    /SMOKE_RETRY_ATTEMPTS must be between 1 and 60/,
  );
  assert.throws(
    () =>
      normalizeSmokePositiveInt("61", "SMOKE_RETRY_ATTEMPTS", {
        max: 60,
        min: 1,
      }),
    /SMOKE_RETRY_ATTEMPTS must be between 1 and 60/,
  );
});

test("smoke config rejects invalid retry environment values", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_RETRY_ATTEMPTS: "many",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_RETRY_ATTEMPTS must be a positive integer/,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_RETRY_DELAY_MS: "60001",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_RETRY_DELAY_MS must be between 1 and 60000/,
      );
    },
  );
});

test("smoke config validates report output paths", () => {
  assert.equal(
    normalizeSmokeReportPath(" tmp\\smoke-report.json "),
    "tmp/smoke-report.json",
  );
  assert.equal(
    normalizeSmokeReportPath("reports/2026-08-20/smoke.JSON"),
    "reports/2026-08-20/smoke.JSON",
  );
  assert.equal(
    normalizeSmokeReportPath(".tmp/publish/smoke-report.json"),
    ".tmp/publish/smoke-report.json",
  );
  assert.throws(
    () => normalizeSmokeReportPath("package.json"),
    /SMOKE_REPORT_PATH must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
  assert.throws(
    () => normalizeSmokeReportPath("tmp/../package.json"),
    /SMOKE_REPORT_PATH must use safe path segments without traversal/,
  );
  assert.throws(
    () => normalizeSmokeReportPath("tmp/smoke-report.txt"),
    /SMOKE_REPORT_PATH must end with .json/,
  );
  assert.throws(
    () => normalizeSmokeReportPath("C:\\tmp\\smoke-report.json"),
    /SMOKE_REPORT_PATH must be a relative JSON report path/,
  );
  assert.throws(
    () => normalizeSmokeReportPath("/tmp/smoke-report.json"),
    /SMOKE_REPORT_PATH must be a relative JSON report path/,
  );
});

test("smoke config rejects unsafe report path environment values", async () => {
  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REPORT_PATH: "../smoke-report.json",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REPORT_PATH must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
      );
    },
  );

  await withEnv(
    {
      API_URL: "https://api.example.com",
      SMOKE_REPORT_PATH: "tmp/smoke report.json",
      WEB_URL: "https://web.example.com",
    },
    async () => {
      assert.throws(
        () => readConfig(),
        /SMOKE_REPORT_PATH must use safe path segments without traversal/,
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
