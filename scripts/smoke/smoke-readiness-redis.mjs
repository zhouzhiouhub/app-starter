import { appendBlocker } from "./smoke-readiness-blockers.mjs";

export function collectRedisReadiness(blockers, redis) {
  if (redis?.productionReady === true) {
    return;
  }

  if (!redis || typeof redis !== "object" || Array.isArray(redis)) {
    appendBlocker(
      blockers,
      "cache.redis",
      "missing-diagnostics",
      "Collect Redis URL diagnostics before production smoke.",
      { variable: "REDIS_URL" },
    );
    return;
  }

  appendBlocker(
    blockers,
    "cache.redis",
    redis.urlIssue ?? "redis-url-not-production-ready",
    "REDIS_URL must point to a production TLS Redis endpoint.",
    {
      host: redis.host ?? null,
      variable: redis.variable ?? "REDIS_URL",
    },
  );
}
