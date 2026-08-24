import { appendBlocker } from "./smoke-readiness-blockers.mjs";

export function collectDatabaseReadiness(blockers, database) {
  if (database?.productionReady === true) {
    return;
  }

  if (!database || typeof database !== "object" || Array.isArray(database)) {
    appendBlocker(
      blockers,
      "database.url",
      "missing-diagnostics",
      "Collect database URL diagnostics before production smoke.",
      { variable: "DATABASE_URL" },
    );
    return;
  }

  if (database.urlSafe !== true) {
    appendBlocker(
      blockers,
      "database.url",
      database.urlIssue ?? "database-url-not-production-ready",
      "DATABASE_URL must be a production PostgreSQL connection URL.",
      {
        host: database.host ?? null,
        variable: database.variable ?? "DATABASE_URL",
      },
    );
    return;
  }

  const migrations = readPlainRecord(database.migrations);

  appendBlocker(
    blockers,
    "database.migrations",
    migrations.issue ?? "missing-diagnostics",
    "Prisma migrations must be committed before production smoke.",
    {
      directory: migrations.directory ?? "services/api/prisma/migrations",
      hasMigrationLock: migrations.hasMigrationLock === true,
      migrationCount: Number.isInteger(migrations.migrationCount)
        ? migrations.migrationCount
        : 0,
    },
  );
}

function readPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}
