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
    "postgresql://postgres:secret@10.0.0.1:5432/app",
    "postgresql://postgres:secret@172.16.0.1:5432/app",
    "postgresql://postgres:secret@192.168.1.20:5432/app",
    "postgresql://postgres:secret@169.254.1.20:5432/app",
    "postgresql://postgres:secret@100.64.0.10:5432/app",
    "postgresql://postgres:secret@192.0.0.10:5432/app",
    "postgresql://postgres:secret@198.18.0.10:5432/app",
    "postgresql://postgres:secret@224.0.0.1:5432/app",
    "postgresql://postgres:secret@[::1]:5432/app",
    "postgresql://postgres:secret@[fd00::1]:5432/app",
    "postgresql://postgres:secret@[fe80::1]:5432/app",
    "postgresql://postgres:secret@[::ffff:7f00:1]:5432/app",
    "postgresql://postgres:secret@host.docker.internal:5432/app",
    "postgresql://postgres:secret@db.localhost:5432/app",
    "postgresql://postgres:secret@db.local:5432/app",
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
    "postgresql://postgres:secret@db.example:5432/app",
    "postgresql://postgres:secret@example.com:5432/app",
    "postgresql://postgres:secret@db.example.org:5432/app",
    "postgresql://postgres:secret@db.example.net:5432/app",
    "postgresql://postgres:secret@db.invalid:5432/app",
    "postgresql://postgres:secret@db.test:5432/app",
    "postgresql://postgres:secret@192.0.2.10:5432/app",
    "postgresql://postgres:secret@198.51.100.10:5432/app",
    "postgresql://postgres:secret@203.0.113.10:5432/app",
    "postgresql://postgres:secret@[::ffff:c000:020a]:5432/app",
    "postgresql://postgres:secret@[2001:db8::1]:5432/app",
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
