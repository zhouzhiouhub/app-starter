import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeReadinessNextActions } from "./smoke-readiness.mjs";

test("smoke readiness next actions preserve the public helper export", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions(
      [
        {
          area: "deployment.api",
          issue: "placeholder-host",
          message: "API_URL must be production ready.",
        },
        {
          area: "deployment.api",
          issue: "placeholder-host",
          message: "API_URL must be production ready.",
        },
      ],
      [
        {
          area: "revalidation.url",
          issue: "uses-web-url-fallback",
          message: "Uses WEB_URL fallback.",
        },
      ],
    ),
    [
      {
        action:
          "Set API_URL to the deployed API HTTPS origin or exact /api/v1 base.",
        area: "deployment.api",
      },
      {
        action:
          "Optionally set STOREFRONT_REVALIDATE_URL explicitly instead of relying on WEB_URL fallback.",
        area: "revalidation.url",
      },
    ],
  );
});

test("smoke readiness next actions explain Redis readiness blockers", () => {
  assert.deepEqual(
    createSmokeReadinessNextActions([
      {
        area: "cache.redis",
        issue: "insecure-protocol",
        message: "REDIS_URL must point to a production TLS Redis endpoint.",
      },
    ]),
    [
      {
        action:
          "Set REDIS_URL to a production rediss:// Redis endpoint outside local or placeholder hosts.",
        area: "cache.redis",
      },
    ],
  );
});
