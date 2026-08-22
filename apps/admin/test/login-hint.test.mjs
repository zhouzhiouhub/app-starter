import assert from "node:assert/strict";
import test from "node:test";
import {
  isProductionAdminBuild,
  readAdminLoginHint,
} from "../src/features/auth/login-hint.ts";

test("admin login keeps a local seed hint without embedding credentials", () => {
  const hint = readAdminLoginHint({ MODE: "development", PROD: false });

  assert.equal(hint.showLocalSeedAccount, true);
  assert.match(hint.description, /Local development/);
  assert.doesNotMatch(hint.description, /admin@example\.com/);
  assert.doesNotMatch(hint.description, /ChangeMe123/);
});

test("admin login hides seeded account details in production builds", () => {
  for (const env of [
    { PROD: true },
    { MODE: "production" },
    { VITE_APP_ENV: "production" },
    { VITE_VERCEL_ENV: "production" },
  ]) {
    const hint = readAdminLoginHint(env);

    assert.equal(isProductionAdminBuild(env), true);
    assert.equal(hint.showLocalSeedAccount, false);
    assert.doesNotMatch(hint.description, /admin@example\.com/);
  }
});
