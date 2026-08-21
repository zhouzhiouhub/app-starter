import assert from "node:assert/strict";
import test from "node:test";
import { assertDatabaseRuntimeConfig } from "../dist/modules/prisma/database-url.js";

test("database runtime config allows local URLs outside production", () => {
  assert.doesNotThrow(() =>
    assertDatabaseRuntimeConfig({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app_starter",
      NODE_ENV: "development",
    }),
  );
});

test("database runtime config accepts production PostgreSQL URLs", () => {
  assert.doesNotThrow(() =>
    assertDatabaseRuntimeConfig({
      DATABASE_URL:
        "postgresql://user:secret@db.brand-platform.com:5432/app?sslmode=require",
      NODE_ENV: "production",
    }),
  );
  assert.doesNotThrow(() =>
    assertDatabaseRuntimeConfig({
      DATABASE_URL:
        "postgres://user:secret@db.brand-platform.net:5432/app?sslmode=require",
      NODE_ENV: "production",
    }),
  );
});

test("database runtime config rejects missing production URLs", () => {
  assert.throws(
    () =>
      assertDatabaseRuntimeConfig({
        DATABASE_URL: undefined,
        NODE_ENV: "production",
      }),
    {
      message: "DATABASE_URL is required in production.",
      name: "DatabaseRuntimeConfigurationError",
    },
  );
});

test("database runtime config rejects non-PostgreSQL production URLs", () => {
  assert.throws(
    () =>
      assertDatabaseRuntimeConfig({
        DATABASE_URL: "file:./dev.db",
        NODE_ENV: "production",
      }),
    /DATABASE_URL must be a valid PostgreSQL connection URL in production/,
  );
});

test("database runtime config rejects local production hosts", () => {
  const localUrls = [
    "postgresql://postgres:secret@localhost:5432/app",
    "postgresql://postgres:secret@127.0.0.1:5432/app",
    "postgresql://postgres:secret@127.10.0.1:5432/app",
    "postgresql://postgres:secret@[::1]:5432/app",
    "postgresql://postgres:secret@host.docker.internal:5432/app",
    "postgresql://postgres:secret@db.localhost:5432/app",
  ];

  for (const databaseUrl of localUrls) {
    assert.throws(
      () =>
        assertDatabaseRuntimeConfig({
          DATABASE_URL: databaseUrl,
          NODE_ENV: "production",
        }),
      /DATABASE_URL must not use local or placeholder hosts in production/,
    );
  }
});

test("database runtime config rejects placeholder production hosts", () => {
  const placeholderUrls = [
    "postgresql://postgres:secret@example.com:5432/app",
    "postgresql://postgres:secret@db.example.org:5432/app",
    "postgresql://postgres:secret@db.example.net:5432/app",
    "postgresql://postgres:secret@db.invalid:5432/app",
    "postgresql://postgres:secret@db.test:5432/app",
  ];

  for (const databaseUrl of placeholderUrls) {
    assert.throws(
      () =>
        assertDatabaseRuntimeConfig({
          DATABASE_URL: databaseUrl,
          NODE_ENV: "production",
        }),
      /DATABASE_URL must not use local or placeholder hosts in production/,
    );
  }
});
