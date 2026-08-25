import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness next actions explain Prisma migration blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "database.migrations",
        directory: "services/api/prisma/migrations",
        issue: "missing-directory",
        message: "Prisma migrations must be committed before production smoke.",
      },
      {
        area: "database.migrations",
        directory: "services/api/prisma/migrations",
        issue: "no-migrations",
        message: "Prisma migrations must be committed before production smoke.",
      },
      {
        area: "database.migrations",
        directory: "services/api/prisma/migrations",
        issue: "missing-migration-lock",
        message: "Prisma migrations must be committed before production smoke.",
      },
      {
        area: "database.migrations",
        directory: "services/api/prisma/migrations",
        issue: "unreadable-directory",
        message: "Prisma migrations must be committed before production smoke.",
      },
    ]),
    [
      {
        action:
          "Create services/api/prisma/migrations with committed Prisma migration folders, then run prisma migrate deploy in production.",
        area: "database.migrations",
      },
      {
        action:
          "Add at least one committed Prisma migration.sql under services/api/prisma/migrations, then deploy with prisma migrate deploy.",
        area: "database.migrations",
      },
      {
        action:
          "Commit services/api/prisma/migrations/migration_lock.toml alongside migration folders before production smoke.",
        area: "database.migrations",
      },
      {
        action:
          "Fix read access to services/api/prisma/migrations so smoke can verify committed Prisma migrations before deploy.",
        area: "database.migrations",
      },
    ],
  );
});
