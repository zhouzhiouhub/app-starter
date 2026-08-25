import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness next actions explain control-character database URL blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "database.url",
        host: null,
        issue: "control-character",
        message: "DATABASE_URL must be a production PostgreSQL connection URL.",
        variable: "DATABASE_URL",
      },
    ]),
    [
      {
        action:
          "Remove control characters from DATABASE_URL before rerunning production smoke.",
        area: "database.url",
      },
    ],
  );
});
