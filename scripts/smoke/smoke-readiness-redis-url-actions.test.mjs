import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness next actions explain control-character Redis URL blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "cache.redis",
        host: null,
        issue: "control-character",
        message: "REDIS_URL must point to a production TLS Redis endpoint.",
        variable: "REDIS_URL",
      },
    ]),
    [
      {
        action:
          "Remove control characters from REDIS_URL before rerunning production smoke.",
        area: "cache.redis",
      },
    ],
  );
});

test("smoke readiness next actions explain surrounding-whitespace Redis URL blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "cache.redis",
        host: null,
        issue: "surrounding-whitespace",
        message: "REDIS_URL must point to a production TLS Redis endpoint.",
        variable: "REDIS_URL",
      },
    ]),
    [
      {
        action:
          "Remove leading and trailing whitespace from REDIS_URL before rerunning production smoke.",
        area: "cache.redis",
      },
    ],
  );
});
