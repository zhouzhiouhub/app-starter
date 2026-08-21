import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  toAuthSessionResponse,
  toCurrentUserResponse,
} from "../dist/modules/identity/identity.mapper.js";
import { readBearerToken } from "../dist/modules/identity/identity.authorization.js";
import {
  loginBodySchema,
  parseLoginBody,
  parseRefreshBody,
} from "../dist/modules/identity/identity.validation.js";
import { hashPassword, verifyPassword } from "../dist/modules/identity/password.js";
import { TokenService } from "../dist/modules/identity/token.service.js";
import {
  loadJwtKeys,
  resetJwtKeysForTests,
} from "../dist/modules/identity/jwt-keys.js";

test("login body lowercases email and requires a password", () => {
  const parsed = loginBodySchema.parse({
    email: "Admin@Example.com",
    password: "ChangeMe123!",
  });

  assert.equal(parsed.email, "admin@example.com");
  assert.equal(parsed.tenantSlug, "default");
  assert.throws(() => loginBodySchema.parse({ email: "admin@example.com" }));
});

test("identity request parsers keep API validation errors structured", () => {
  const parsedLogin = parseLoginBody({
    email: "Admin@Example.com",
    password: "ChangeMe123!",
  });
  const parsedRefresh = parseRefreshBody({
    refreshToken: "refresh-token-value",
  });

  assert.equal(parsedLogin.email, "admin@example.com");
  assert.equal(parsedRefresh.refreshToken, "refresh-token-value");
  assert.throws(
    () => parseLoginBody({ email: "admin@example.com" }),
    (error) =>
      error.getResponse?.().code === "VALIDATION_ERROR" &&
      error.getStatus?.() === 400,
  );
});

test("identity authorization reads bearer tokens defensively", () => {
  assert.equal(readBearerToken("Bearer access-token"), "access-token");
  assert.equal(readBearerToken("bearer access-token"), "access-token");
  assert.equal(readBearerToken("  Bearer   access-token  "), "access-token");
  assert.equal(readBearerToken(undefined), undefined);
  assert.equal(readBearerToken("Basic access-token"), undefined);
  assert.equal(readBearerToken("Bearer"), undefined);
  assert.equal(readBearerToken("Bearer "), undefined);
  assert.equal(readBearerToken("Bearer access-token extra"), undefined);
});

test("password hashing uses bcrypt and verifies the original value", async () => {
  const passwordHash = await hashPassword("ChangeMe123!");

  assert.equal(await verifyPassword("ChangeMe123!", passwordHash), true);
  assert.equal(await verifyPassword("wrong-password", passwordHash), false);
});

test("token service signs and verifies RS256 access tokens", async () => {
  resetJwtKeysForTests();
  const tokens = new TokenService();
  const issued = await tokens.issueTokens({
    email: "admin@example.com",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Admin",
    roles: ["tenant-admin"],
    scopes: ["page:read", "page:write"],
    status: "active",
    tenantId: "22222222-2222-4222-8222-222222222222",
  });
  const claims = await tokens.verifyAccessToken(issued.accessToken);

  assert.equal(claims.email, "admin@example.com");
  assert.equal(claims.sub, "11111111-1111-4111-8111-111111111111");
  assert.deepEqual(claims.scopes, ["page:read", "page:write"]);
  assert.notEqual(issued.refreshToken, issued.accessToken);
  assert.equal(tokens.hashRefreshToken(issued.refreshToken).length, 64);
});

test("JWT key loader accepts configured matching PEM key pairs", async () => {
  const pair = createRsaPemPair();
  const restoreEnv = withJwtKeyEnv({
    JWT_PRIVATE_KEY: pair.privateKey.replaceAll("\n", "\\n"),
    JWT_PUBLIC_KEY: pair.publicKey.replaceAll("\n", "\\n"),
    NODE_ENV: "production",
  });
  resetJwtKeysForTests();

  try {
    const keys = await loadJwtKeys();
    assert.equal(keys.generated, false);
  } finally {
    restoreEnv();
    resetJwtKeysForTests();
  }
});

test("JWT key loader rejects partial key pair configuration", async () => {
  const pair = createRsaPemPair();
  const restoreEnv = withJwtKeyEnv({
    JWT_PRIVATE_KEY: pair.privateKey,
    JWT_PUBLIC_KEY: undefined,
    NODE_ENV: "development",
  });
  resetJwtKeysForTests();

  try {
    await assert.rejects(
      () => loadJwtKeys(),
      /JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured together/,
    );
  } finally {
    restoreEnv();
    resetJwtKeysForTests();
  }
});

test("JWT key loader rejects mismatched configured key pairs", async () => {
  const privatePair = createRsaPemPair();
  const publicPair = createRsaPemPair();
  const restoreEnv = withJwtKeyEnv({
    JWT_PRIVATE_KEY: privatePair.privateKey,
    JWT_PUBLIC_KEY: publicPair.publicKey,
    NODE_ENV: "production",
  });
  resetJwtKeysForTests();

  try {
    await assert.rejects(
      () => loadJwtKeys(),
      /JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be a valid matching RS256 key pair/,
    );
  } finally {
    restoreEnv();
    resetJwtKeysForTests();
  }
});

test("identity response mappers carry the current request id", () => {
  const actor = {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    roles: ["tenant-admin"],
    scopes: ["page:read"],
    status: "active",
    tenantId: "tenant-1",
  };
  const session = toAuthSessionResponse(
    actor,
    {
      accessToken: "access-token",
      refreshToken: "refresh-token",
    },
    "request-auth-session",
  );
  const currentUser = toCurrentUserResponse(actor, "request-auth-me");

  assert.equal(session.meta.requestId, "request-auth-session");
  assert.equal(currentUser.meta.requestId, "request-auth-me");
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

function withJwtKeyEnv(values) {
  const keys = ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "NODE_ENV"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const key of keys) {
      const value = previous[key];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}
