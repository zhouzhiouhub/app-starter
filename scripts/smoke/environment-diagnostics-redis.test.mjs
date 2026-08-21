import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports Redis readiness without secrets", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://cache-user:super-secret@redis.brand-cache.com:6379/0",
  });

  assert.deepEqual(diagnostics.redis, {
    configured: true,
    host: "redis.brand-cache.com",
    productionReady: true,
    urlIssue: null,
    urlSafe: true,
    usesTls: true,
    variable: "REDIS_URL",
  });

  const serialized = JSON.stringify(diagnostics.redis);
  assert.equal(serialized.includes("cache-user"), false);
  assert.equal(serialized.includes("super-secret"), false);
  assert.equal(serialized.includes("/0"), false);
});

test("smoke environment diagnostics reports unsafe Redis URLs", () => {
  const missing = createSmokeEnvironmentDiagnostics({});
  const invalid = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "redis-cache",
  });
  const postgres = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "postgresql://cache.example.com:5432/app",
  });
  const hostless = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss:///0",
  });
  const insecure = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "redis://redis.brand-cache.com:6379",
  });
  const localhost = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "redis://localhost:6379",
  });
  const privateIpv4 = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://10.0.0.1:6379",
  });
  const sharedAddress = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://100.64.0.10:6379",
  });
  const multicastAddress = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://224.0.0.1:6379",
  });
  const privateIpv6 = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://[fd00::1]:6379",
  });
  const placeholder = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://redis.example.com:6379",
  });
  const documentationIpv4 = createSmokeEnvironmentDiagnostics({
    REDIS_URL: "rediss://203.0.113.10:6379",
  });

  assert.equal(missing.redis.configured, false);
  assert.equal(missing.redis.urlIssue, "missing-url");
  assert.equal(missing.redis.productionReady, false);
  assert.equal(invalid.redis.urlIssue, "invalid-url");
  assert.equal(postgres.redis.urlIssue, "unsupported-protocol");
  assert.equal(hostless.redis.urlIssue, "missing-host");
  assert.equal(hostless.redis.productionReady, false);
  assert.equal(insecure.redis.urlIssue, "insecure-protocol");
  assert.equal(insecure.redis.usesTls, false);
  assert.equal(localhost.redis.urlIssue, "local-host");
  assert.equal(privateIpv4.redis.urlIssue, "local-host");
  assert.equal(sharedAddress.redis.urlIssue, "local-host");
  assert.equal(multicastAddress.redis.urlIssue, "local-host");
  assert.equal(privateIpv6.redis.urlIssue, "local-host");
  assert.equal(placeholder.redis.urlIssue, "placeholder-host");
  assert.equal(documentationIpv4.redis.urlIssue, "placeholder-host");
});
