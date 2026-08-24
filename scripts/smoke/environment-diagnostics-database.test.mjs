import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    migrations: {
      directory: "services/api/prisma/migrations",
      hasMigrationLock: true,
      issue: null,
      migrationCount: 1,
      productionReady: true,
    },
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

test("smoke environment diagnostics reports missing Prisma migrations", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics(
    {
      DATABASE_URL:
        "postgresql://db-user:super-secret@db.brand-platform.com:5432/app_starter?sslmode=require",
    },
    {
      prismaMigrationsDir: join(
        tmpdir(),
        `app-starter-missing-migrations-${randomUUID()}`,
      ),
      prismaMigrationsLabel: "services/api/prisma/migrations",
    },
  );

  assert.deepEqual(diagnostics.database.migrations, {
    directory: "services/api/prisma/migrations",
    hasMigrationLock: false,
    issue: "missing-directory",
    migrationCount: 0,
    productionReady: false,
  });
  assert.equal(diagnostics.database.urlSafe, true);
  assert.equal(diagnostics.database.productionReady, false);
});

test("smoke environment diagnostics reports unsafe database URLs", () => {
  const missing = createSmokeEnvironmentDiagnostics({});
  const sqlite = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "file:./dev.db",
  });
  const hostless = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql:///app",
  });
  const localhost = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@localhost:5432/app",
  });
  const loopback = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@127.0.0.1:5432/app",
  });
  const privateIpv4 = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@10.0.0.1:5432/app",
  });
  const sharedAddress = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@100.64.0.10:5432/app",
  });
  const benchmarkAddress = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@198.18.0.10:5432/app",
  });
  const privateIpv6 = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@[fd00::1]:5432/app",
  });
  const dockerHost = createSmokeEnvironmentDiagnostics({
    DATABASE_URL:
      "postgresql://postgres:secret@host.docker.internal:5432/app",
  });
  const placeholder = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@db.example.com:5432/app",
  });
  const documentationIpv6 = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@[2001:db8::1]:5432/app",
  });
  const documentationIpv4 = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@192.0.2.10:5432/app",
  });
  const mappedDocumentationIpv4 = createSmokeEnvironmentDiagnostics({
    DATABASE_URL: "postgresql://postgres:secret@[::ffff:c000:020a]:5432/app",
  });

  assert.equal(missing.database.configured, false);
  assert.equal(missing.database.urlIssue, "missing-url");
  assert.equal(missing.database.productionReady, false);
  assert.equal(sqlite.database.urlIssue, "unsupported-protocol");
  assert.equal(sqlite.database.productionReady, false);
  assert.equal(hostless.database.urlIssue, "missing-host");
  assert.equal(hostless.database.productionReady, false);
  assert.equal(localhost.database.urlIssue, "local-host");
  assert.equal(localhost.database.productionReady, false);
  assert.equal(loopback.database.urlIssue, "local-host");
  assert.equal(loopback.database.productionReady, false);
  assert.equal(privateIpv4.database.urlIssue, "local-host");
  assert.equal(privateIpv4.database.productionReady, false);
  assert.equal(sharedAddress.database.urlIssue, "local-host");
  assert.equal(sharedAddress.database.productionReady, false);
  assert.equal(benchmarkAddress.database.urlIssue, "local-host");
  assert.equal(benchmarkAddress.database.productionReady, false);
  assert.equal(privateIpv6.database.urlIssue, "local-host");
  assert.equal(privateIpv6.database.productionReady, false);
  assert.equal(dockerHost.database.urlIssue, "local-host");
  assert.equal(dockerHost.database.productionReady, false);
  assert.equal(placeholder.database.urlIssue, "placeholder-host");
  assert.equal(placeholder.database.productionReady, false);
  assert.equal(documentationIpv6.database.urlIssue, "placeholder-host");
  assert.equal(documentationIpv6.database.productionReady, false);
  assert.equal(documentationIpv4.database.urlIssue, "placeholder-host");
  assert.equal(documentationIpv4.database.productionReady, false);
  assert.equal(mappedDocumentationIpv4.database.urlIssue, "placeholder-host");
  assert.equal(mappedDocumentationIpv4.database.productionReady, false);
});
