import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  runProductionSmokeReleaseInputsCli,
  validateProductionSmokeReleaseInputs,
} from "./production-smoke-release-inputs.mjs";
import {
  readProductionSmokeReadinessConfig,
  validateProductionSmokeRuntimeReadiness,
} from "./production-smoke-release-readiness.mjs";

test("production smoke runtime readiness preflight skips non-production environments", () => {
  assert.deepEqual(validateProductionSmokeRuntimeReadiness({}), {
    productionReadinessChecked: false,
    productionReady: null,
  });
  assert.deepEqual(
    validateProductionSmokeRuntimeReadiness({
      APP_ENV: "development",
      NODE_ENV: "test",
      VERCEL_ENV: "preview",
    }),
    {
      productionReadinessChecked: false,
      productionReady: null,
    },
  );
});

test("production smoke runtime readiness preflight defaults release gates on", () => {
  const env = createProductionReadyEnv();
  delete env.SMOKE_REQUIRE_ADMIN_APP;
  delete env.SMOKE_REQUIRE_R2_UPLOAD;
  delete env.SMOKE_REQUIRE_REVALIDATION;

  assert.deepEqual(readProductionSmokeReadinessConfig(env), {
    reportPath: "artifacts/production-smoke/smoke-report.json",
    requireAdminApp: true,
    requireR2Upload: true,
    requireRevalidation: true,
  });
});

test("production smoke release input preflight accepts production-ready runtime", () => {
  const result = validateProductionSmokeReleaseInputs(createProductionReadyEnv());

  assert.deepEqual(result, {
    releaseNotesAllowBlocked: false,
    releaseNotesEnabled: false,
    visualArtifactDownloadEnabled: false,
  });
});

test("production smoke release input preflight blocks unsafe production runtime", () => {
  const error = readThrownError(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createProductionReadyEnv(),
        API_URL: "https://api.example.com/api/v1",
        DATABASE_URL: "",
        WEB_URL: "http://localhost:3000",
      }),
  );

  assert.match(
    error.message,
    /Production smoke runtime readiness failed before smoke requests/,
  );
  assert.match(error.message, /\(3 blockers\)/);
  assert.match(error.message, /database\.url\/missing-url/);
  assert.match(error.message, /deployment\.api\/placeholder-host/);
  assert.match(error.message, /deployment\.web\/local-host/);
});

test("production smoke release input preflight blocks disabled production evidence gates", () => {
  const error = readThrownError(
    () =>
      validateProductionSmokeReleaseInputs({
        ...createProductionReadyEnv(),
        SMOKE_REQUIRE_ADMIN_APP: "false",
        SMOKE_REQUIRE_R2_UPLOAD: "false",
        SMOKE_REQUIRE_REVALIDATION: "false",
      }),
  );

  assert.match(
    error.message,
    /Production smoke runtime readiness failed before smoke requests/,
  );
  assert.match(error.message, /\(3 blockers\)/);
  assert.match(error.message, /deployment\.admin\/admin-smoke-not-required/);
  assert.match(error.message, /media\.r2\/r2-upload-smoke-not-required/);
  assert.match(error.message, /revalidation\/revalidation-smoke-not-required/);
  assert.match(error.message, /Next actions:/);
  assert.match(error.message, /Set SMOKE_REQUIRE_ADMIN_APP=true/);
  assert.match(error.message, /Set SMOKE_REQUIRE_R2_UPLOAD=true/);
  assert.match(error.message, /Set SMOKE_REQUIRE_REVALIDATION=true/);
});

test("production smoke release input preflight blocks missing smoke login credentials", () => {
  const env = createProductionReadyEnv();
  delete env.SMOKE_ADMIN_EMAIL;
  delete env.SMOKE_ADMIN_PASSWORD;

  const error = readThrownError(() => validateProductionSmokeReleaseInputs(env));

  assert.match(
    error.message,
    /Production smoke runtime readiness failed before smoke requests/,
  );
  assert.match(error.message, /\(1 blockers\)/);
  assert.match(error.message, /smoke\.login\/missing-required-env/);
  assert.match(
    error.message,
    /Configure SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD/,
  );
});

test("production smoke release input preflight blocks default smoke login credentials", () => {
  const error = readThrownError(() =>
    validateProductionSmokeReleaseInputs({
      ...createProductionReadyEnv(),
      SMOKE_ADMIN_EMAIL: "admin@example.com",
    }),
  );

  assert.match(error.message, /\(1 blockers\)/);
  assert.match(error.message, /smoke\.login\/default-local-credentials/);
  assert.match(error.message, /documented local default/);
});

test("production smoke release input preflight blocks invalid smoke login credentials", () => {
  const error = readThrownError(() =>
    validateProductionSmokeReleaseInputs({
      ...createProductionReadyEnv(),
      SMOKE_ADMIN_EMAIL: "owner",
    }),
  );

  assert.match(error.message, /SMOKE_ADMIN_EMAIL must be a valid email/);
});

test("production smoke release input preflight CLI prints readiness actions", async () => {
  const stderr = [];
  const exitCode = await runProductionSmokeReleaseInputsCli([], {
    env: {
      ...createProductionReadyEnv(),
      DATABASE_URL: "",
    },
    stderr: (line) => stderr.push(line),
    stdout: () => {},
  });
  const output = stderr.join("\n");

  assert.equal(exitCode, 1);
  assert.match(
    output,
    /Production smoke runtime readiness failed before smoke requests/,
  );
  assert.match(output, /database\.url\/missing-url/);
  assert.match(output, /Next actions:/);
  assert.match(
    output,
    /Set DATABASE_URL to a production PostgreSQL connection URL outside local or placeholder hosts/,
  );
});

function createProductionReadyEnv() {
  return {
    ...readJwtKeyPairFixture(),
    ADMIN_URL: "https://admin.brand-platform.com",
    ANALYTICS_CONSENT_GRANTED: "false",
    ANALYTICS_ENABLED: "false",
    APP_ENV: "production",
    API_URL: "https://api.brand-platform.com/api/v1",
    COMMERCE_ENABLED: "false",
    DATABASE_URL:
      "postgresql://app_starter:secret@db.brand-platform.com:5432/app_starter?sslmode=require",
    MEDIA_CDN_BASE_URL: "https://cdn.brand-platform.com/media",
    MULTI_LOCALE_ENABLED: "false",
    PREVIEW_TOKEN_SECRET: "preview-token-secret-for-production",
    R2_ACCESS_KEY_ID: "r2AccessKeyIdProductionValue",
    R2_ACCOUNT_ID: "brand-platform-r2",
    R2_BUCKET: "brand-platform-assets",
    R2_REGION: "auto",
    R2_SECRET_ACCESS_KEY: "r2SecretAccessKeyProductionValue",
    REDIS_URL: "rediss://redis.brand-platform.com:6379",
    SMOKE_REPORT_PATH: "artifacts/production-smoke/smoke-report.json",
    SMOKE_ADMIN_EMAIL: "owner@brand-platform.com",
    SMOKE_ADMIN_PASSWORD: "production-password",
    SMOKE_REQUIRE_ADMIN_APP: "true",
    SMOKE_REQUIRE_R2_UPLOAD: "true",
    SMOKE_REQUIRE_REVALIDATION: "true",
    STOREFRONT_REVALIDATE_SECRET: "revalidation-secret-for-production",
    STOREFRONT_REVALIDATE_URL:
      "https://store.brand-platform.com/api/revalidate",
    WEB_URL: "https://store.brand-platform.com",
  };
}

function readThrownError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new assert.AssertionError({
    message: "Expected callback to throw.",
  });
}

let jwtKeyPairFixture;

function readJwtKeyPairFixture() {
  if (!jwtKeyPairFixture) {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });

    jwtKeyPairFixture = {
      JWT_PRIVATE_KEY: String(
        privateKey.export({ format: "pem", type: "pkcs8" }),
      ),
      JWT_PUBLIC_KEY: String(publicKey.export({ format: "pem", type: "spki" })),
    };
  }

  return jwtKeyPairFixture;
}
