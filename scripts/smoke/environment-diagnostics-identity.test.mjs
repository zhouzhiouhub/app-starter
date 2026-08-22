import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

const privateKey =
  "-----BEGIN PRIVATE KEY-----\\nprivate-key-body\\n-----END PRIVATE KEY-----";
const publicKey =
  "-----BEGIN PUBLIC KEY-----\\npublic-key-body\\n-----END PUBLIC KEY-----";

test("smoke environment diagnostics reports JWT key readiness without secrets", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    JWT_PRIVATE_KEY: privateKey,
    JWT_PUBLIC_KEY: publicKey,
  });

  assert.deepEqual(diagnostics.identity, {
    jwt: {
      configured: true,
      privateKey: {
        configured: true,
        issue: null,
        valid: true,
      },
      productionReady: true,
      publicKey: {
        configured: true,
        issue: null,
        valid: true,
      },
    },
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("private-key-body"), false);
  assert.equal(serialized.includes("public-key-body"), false);
});

test("smoke environment diagnostics reports missing or invalid JWT keys", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    JWT_PRIVATE_KEY: "not-a-pem",
  });

  assert.deepEqual(diagnostics.identity, {
    jwt: {
      configured: false,
      privateKey: {
        configured: true,
        issue: "invalid-pem",
        valid: false,
      },
      productionReady: false,
      publicKey: {
        configured: false,
        issue: null,
        valid: false,
      },
    },
  });
});
