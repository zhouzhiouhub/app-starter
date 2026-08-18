import assert from "node:assert/strict";
import test from "node:test";
import { loginBodySchema } from "../dist/modules/identity/identity.validation.js";
import { hashPassword, verifyPassword } from "../dist/modules/identity/password.js";
import { TokenService } from "../dist/modules/identity/token.service.js";
import { resetJwtKeysForTests } from "../dist/modules/identity/jwt-keys.js";

test("login body lowercases email and requires a password", () => {
  const parsed = loginBodySchema.parse({
    email: "Admin@Example.com",
    password: "ChangeMe123!",
  });

  assert.equal(parsed.email, "admin@example.com");
  assert.equal(parsed.tenantSlug, "default");
  assert.throws(() => loginBodySchema.parse({ email: "admin@example.com" }));
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
