import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AdminApiGuard } from "../dist/common/admin-api.guard.js";

const actor = {
  email: "admin@example.com",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["page:read", "page:write"],
  status: "active",
  tenantId: "22222222-2222-4222-8222-222222222222",
};

test("admin API guard rejects missing access tokens", async () => {
  const guard = createGuard(
    {
      readActorFromAuthorization: async () => {
        throw new UnauthorizedException({
          message: "Access token is required.",
        });
      },
    },
    [],
  );

  await assert.rejects(() => guard.canActivate(createContext()), {
    name: "UnauthorizedException",
  });
});

test("admin API guard rejects duplicated authorization headers", async () => {
  const request = {
    headers: {
      authorization: ["Bearer valid-token", "Bearer shadow-token"],
    },
  };
  const guard = createGuard(
    {
      readActorFromAuthorization: async (authorization) => {
        assert.equal(authorization, undefined);
        throw new UnauthorizedException({
          message: "Access token is required.",
        });
      },
    },
    [],
  );

  await assert.rejects(() => guard.canActivate(createContext(request)), {
    name: "UnauthorizedException",
  });
});

test("admin API guard attaches the actor when scopes match", async () => {
  const request = { headers: { authorization: "Bearer token" } };
  const guard = createGuard(
    {
      readActorFromAuthorization: async () => actor,
    },
    ["page:write"],
  );

  assert.equal(await guard.canActivate(createContext(request)), true);
  assert.equal(request.user, actor);
});

test("admin API guard forbids actors missing a required scope", async () => {
  const guard = createGuard(
    {
      readActorFromAuthorization: async () => actor,
    },
    ["page:publish"],
  );

  await assert.rejects(
    () => guard.canActivate(createContext()),
    (error) => error instanceof ForbiddenException,
  );
});

function createGuard(identity, requiredScopes) {
  return new AdminApiGuard(identity, {
    getAllAndOverride() {
      return requiredScopes;
    },
  });
}

function createContext(request = { headers: {} }) {
  return {
    getClass: () => class TestController {},
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}
