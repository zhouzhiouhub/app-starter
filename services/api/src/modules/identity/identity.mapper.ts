import { ACCESS_TOKEN_TTL_SECONDS } from "./identity.constants.js";
import type { Actor, AuthTokens } from "./identity.types.js";

type RoleRecord = {
  name: string;
  permissions: unknown;
};

type UserRecord = {
  email: string;
  id: string;
  name: string | null;
  status: string;
  tenantId: string;
};

type UserWithRoles = UserRecord & {
  roles: Array<{ role: RoleRecord }>;
};

export function toActorFromUser(user: UserWithRoles): Actor {
  return toActor(
    user,
    user.roles.map((item) => item.role),
  );
}

export function toActor(user: UserRecord, roles: RoleRecord[]): Actor {
  const scopes = [
    ...new Set(roles.flatMap((role) => readPermissions(role.permissions))),
  ];

  return {
    email: user.email,
    id: user.id,
    name: user.name,
    roles: roles.map((role) => role.name),
    scopes,
    status: user.status,
    tenantId: user.tenantId,
  };
}

export function toAuthSessionResponse(actor: Actor, tokens: AuthTokens) {
  return {
    data: {
      accessToken: tokens.accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: tokens.refreshToken,
      tokenType: "Bearer",
      user: {
        email: actor.email,
        id: actor.id,
        name: actor.name,
        roles: actor.roles,
        scopes: actor.scopes,
        tenantId: actor.tenantId,
      },
    },
    meta: {
      requestId: "local-dev",
      tenantId: actor.tenantId,
    },
  };
}

export function toCurrentUserResponse(actor: Actor) {
  return {
    data: {
      email: actor.email,
      id: actor.id,
      name: actor.name,
      roles: actor.roles,
      scopes: actor.scopes,
      tenantId: actor.tenantId,
    },
    meta: {
      requestId: "local-dev",
      tenantId: actor.tenantId,
    },
  };
}

function readPermissions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
