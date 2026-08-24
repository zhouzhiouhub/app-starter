import assert from "node:assert/strict";
import test from "node:test";
import { readSeedAdminCredentials } from "../prisma/seed.mjs";

test("seed credentials keep documented local defaults outside production", () => {
  assert.deepEqual(readSeedAdminCredentials({}), {
    email: "admin@example.com",
    password: "ChangeMe123!",
  });
});

test("seed credentials normalize explicit local admin emails", () => {
  assert.deepEqual(
    readSeedAdminCredentials({
      SEED_ADMIN_EMAIL: " Owner@Example.COM ",
      SEED_ADMIN_PASSWORD: "local-password",
    }),
    {
      email: "owner@example.com",
      password: "local-password",
    },
  );
});

test("seed credentials reject empty values", () => {
  assert.throws(
    () =>
      readSeedAdminCredentials({
        SEED_ADMIN_EMAIL: " ",
        SEED_ADMIN_PASSWORD: "local-password",
      }),
    /cannot be empty/,
  );
  assert.throws(
    () =>
      readSeedAdminCredentials({
        SEED_ADMIN_EMAIL: "owner@example.com",
        SEED_ADMIN_PASSWORD: " ",
      }),
    /cannot be empty/,
  );
});

test("seed credentials reject invalid admin emails", () => {
  for (const email of [
    "owner",
    "owner@example",
    "owner example@brand.com",
    "owner@exa\rmple.com",
  ]) {
    assert.throws(
      () =>
        readSeedAdminCredentials({
          SEED_ADMIN_EMAIL: email,
          SEED_ADMIN_PASSWORD: "local-password",
        }),
      /valid email/,
    );
  }
});

test("seed credentials reject unsafe admin passwords", () => {
  for (const password of ["short", "a".repeat(129), "valid-password\r"]) {
    assert.throws(
      () =>
        readSeedAdminCredentials({
          SEED_ADMIN_EMAIL: "owner@example.com",
          SEED_ADMIN_PASSWORD: password,
        }),
      /8 to 128 characters/,
    );
  }
});

test("seed credentials reject documented defaults in production", () => {
  assert.throws(
    () => readSeedAdminCredentials({ NODE_ENV: "production" }),
    /Production seed requires non-default/,
  );
  assert.throws(
    () =>
      readSeedAdminCredentials({
        NODE_ENV: "production",
        SEED_ADMIN_EMAIL: "owner@example.com",
        SEED_ADMIN_PASSWORD: "ChangeMe123!",
      }),
    /Production seed requires non-default/,
  );
  assert.throws(
    () =>
      readSeedAdminCredentials({
        APP_ENV: "production",
        SEED_ADMIN_EMAIL: "admin@example.com",
        SEED_ADMIN_PASSWORD: "stronger-local-password",
      }),
    /Production seed requires non-default/,
  );
});

test("seed credentials accept explicit non-default production values", () => {
  assert.deepEqual(
    readSeedAdminCredentials({
      NODE_ENV: "production",
      SEED_ADMIN_EMAIL: "owner@brand-platform.com",
      SEED_ADMIN_PASSWORD: "non-default-admin-password",
    }),
    {
      email: "owner@brand-platform.com",
      password: "non-default-admin-password",
    },
  );
});
