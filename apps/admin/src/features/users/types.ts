import type { AuthUser } from "../auth/types";

export interface ScopeGroupSummary {
  name: string;
  scopes: string[];
}

export interface UserAccessSummary {
  displayName: string;
  email: string;
  roleCount: number;
  roles: string[];
  scopeCount: number;
  scopeGroups: ScopeGroupSummary[];
  tenantId: string;
  userId: string;
}

export interface CurrentUserState {
  error: string | null;
  isLoading: boolean;
  load: () => Promise<void>;
  user: AuthUser | null;
}
