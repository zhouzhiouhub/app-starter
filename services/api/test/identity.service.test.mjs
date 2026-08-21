import assert from "node:assert/strict";
import test from "node:test";
import { IdentityService } from "../dist/modules/identity/identity.service.js";

test("identity service rotates refresh tokens on refresh", async () => {
  const createdRecords = [];
  const updatedRecords = [];
  const service = new IdentityService(
    {
      refreshToken: {
        create(options) {
          createdRecords.push(options.data);
          return Promise.resolve({ id: "refresh-token-2" });
        },
        findUnique(options) {
          assert.deepEqual(options.where, {
            tokenHash: "hash:refresh-token-1-value",
          });
          return Promise.resolve({
            expiresAt: new Date(Date.now() + 60_000),
            id: "refresh-token-1",
            revokedAt: null,
            user: createActiveUser(),
            userId: "user-1",
          });
        },
        update(options) {
          updatedRecords.push(options);
          return Promise.resolve(options.data);
        },
      },
    },
    createTokenService(),
  );

  const response = await service.refresh(
    { refreshToken: "refresh-token-1-value" },
    "request-refresh",
  );

  assert.equal(response.data.accessToken, "access-token-user-1");
  assert.equal(response.data.refreshToken, "refresh-token-new");
  assert.equal(response.meta.requestId, "request-refresh");
  assert.deepEqual(createdRecords, [
    {
      expiresAt: new Date("2026-08-22T00:00:00.000Z"),
      tokenHash: "hash:refresh-token-new",
      userId: "user-1",
    },
  ]);
  assert.equal(updatedRecords.length, 1);
  assert.deepEqual(updatedRecords[0].where, { id: "refresh-token-1" });
  assert.equal(updatedRecords[0].data.replacedById, "refresh-token-2");
  assert.equal(updatedRecords[0].data.revokedAt instanceof Date, true);
});

test("identity service revokes active user tokens on refresh replay", async () => {
  const revokedQueries = [];
  const service = new IdentityService(
    {
      refreshToken: {
        findUnique() {
          return Promise.resolve({
            expiresAt: new Date(Date.now() + 60_000),
            id: "refresh-token-1",
            revokedAt: new Date("2026-08-21T00:00:00.000Z"),
            user: createActiveUser(),
            userId: "user-1",
          });
        },
        updateMany(options) {
          revokedQueries.push(options);
          return Promise.resolve({ count: 2 });
        },
      },
    },
    createTokenService(),
  );

  await assert.rejects(
    () => service.refresh({ refreshToken: "refresh-token-1-value" }),
    (error) =>
      error.getStatus?.() === 401 &&
      error.getResponse?.().message ===
        "Refresh token has already been used.",
  );

  assert.equal(revokedQueries.length, 1);
  assert.deepEqual(revokedQueries[0].where, {
    revokedAt: null,
    userId: "user-1",
  });
  assert.equal(revokedQueries[0].data.revokedAt instanceof Date, true);
});

function createActiveUser() {
  return {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    passwordHash: "password-hash",
    roles: [
      {
        role: {
          name: "tenant-admin",
          permissions: ["page:read", "page:write"],
        },
      },
    ],
    status: "active",
    tenantId: "tenant-1",
  };
}

function createTokenService() {
  return {
    hashRefreshToken(token) {
      return `hash:${token}`;
    },
    issueTokens(actor) {
      return Promise.resolve({
        accessToken: `access-token-${actor.id}`,
        refreshToken: "refresh-token-new",
      });
    },
    refreshTokenExpiresAt() {
      return new Date("2026-08-22T00:00:00.000Z");
    },
  };
}
