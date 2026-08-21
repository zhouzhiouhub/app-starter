import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports database readiness without secrets", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    DATABASE_URL:
      "postgresql://db-user:super-secret@db.brand-platform.com:5432/app_starter?sslmode=require",
  });

  assert.deepEqual(diagnostics.database, {
    configured: true,
    host: "db.brand-platform.com",
    productionReady: true,
    urlIssue: null,
    urlSafe: true,
    variable: "DATABASE_URL",
  });

  const serialized = JSON.stringify(diagnostics.database);
  assert.equal(serialized.includes("db-user"), false);
  assert.equal(serialized.includes("super-secret"), false);
  assert.equal(serialized.includes("app_starter"), false);
  assert.equal(serialized.includes("sslmode"), false);
});

test("smoke environment diagnostics reports unsafe database URLs", () => {
  const missing = createSmokeEnvironmentDiagnostics({});
  const sqlite = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "file:./dev.db",
  });
  const localhost = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/app",
  });
  const loopback = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@127.0.0.1:5432/app",
  });
  const placeholder = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@db.example.com:5432/app",
  });

  assert.equal(missing.database.configured, false);
  assert.equal(missing.database.urlIssue, "missing-url");
  assert.equal(missing.database.productionReady, false);
  assert.equal(sqlite.database.urlIssue, "unsupported-protocol");
  assert.equal(sqlite.database.productionReady, false);
  assert.equal(localhost.database.urlIssue, "local-host");
  assert.equal(localhost.database.productionReady, false);
  assert.equal(loopback.database.urlIssue, "local-host");
  assert.equal(loopback.database.productionReady, false);
  assert.equal(placeholder.database.urlIssue, "placeholder-host");
  assert.equal(placeholder.database.productionReady, false);
});
