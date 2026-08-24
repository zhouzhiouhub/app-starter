import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports JWT key readiness without secrets", () => {
  const pair = createRsaPemPair();
  const diagnostics = createSmokeEnvironmentDiagnostics({
    JWT_PRIVATE_KEY: pair.privateKey.replaceAll("\n", "\\n"),
    JWT_PUBLIC_KEY: pair.publicKey.replaceAll("\n", "\\n"),
  });

  assert.deepEqual(diagnostics.identity, {
    jwt: {
      configured: true,
      pair: {
        checked: true,
        issue: null,
        valid: true,
      },
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
  assert.equal(serialized.includes("PRIVATE KEY"), false);
  assert.equal(serialized.includes("PUBLIC KEY"), false);
});

test("smoke environment diagnostics reports missing or invalid JWT keys", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    JWT_PRIVATE_KEY: "not-a-pem",
  });

  assert.deepEqual(diagnostics.identity, {
    jwt: {
      configured: false,
      pair: {
        checked: false,
        issue: null,
        valid: false,
      },
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

test("smoke environment diagnostics rejects mismatched JWT key pairs", () => {
  const privatePair = createRsaPemPair();
  const publicPair = createRsaPemPair();
  const diagnostics = createSmokeEnvironmentDiagnostics({
    JWT_PRIVATE_KEY: privatePair.privateKey,
    JWT_PUBLIC_KEY: publicPair.publicKey,
  });

  assert.deepEqual(diagnostics.identity.jwt.pair, {
    checked: true,
    issue: "mismatched-key-pair",
    valid: false,
  });
  assert.equal(diagnostics.identity.jwt.privateKey.valid, true);
  assert.equal(diagnostics.identity.jwt.publicKey.valid, true);
  assert.equal(diagnostics.identity.jwt.productionReady, false);
});

function createRsaPemPair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki",
    },
  });
}
