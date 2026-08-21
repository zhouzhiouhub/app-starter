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
}
