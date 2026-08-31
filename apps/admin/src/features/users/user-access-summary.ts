import type { AuthUser } from "../auth/types";
import type { ScopeGroupSummary, UserAccessSummary } from "./types";

export function buildUserAccessSummary(user: AuthUser): UserAccessSummary {
  const roles = [...user.roles].sort();
  const scopes = [...user.scopes].sort();

  return {
    displayName: user.name?.trim() || user.email,
    email: user.email,
    roleCount: roles.length,
    roles,
    scopeCount: scopes.length,
    scopeGroups: groupScopes(scopes),
    tenantId: user.tenantId,
    userId: user.id,
  };
}

function groupScopes(scopes: string[]): ScopeGroupSummary[] {
  const groups = new Map<string, string[]>();

  for (const scope of scopes) {
    const groupName = readScopeGroupName(scope);
    groups.set(groupName, [...(groups.get(groupName) ?? []), scope]);
  }

  return Array.from(groups.entries()).map(([name, groupedScopes]) => ({
    name,
    scopes: groupedScopes,
  }));
}

function readScopeGroupName(scope: string): string {
  const delimiterIndex = scope.indexOf(":");
  return delimiterIndex > 0 ? scope.slice(0, delimiterIndex) : "general";
}
