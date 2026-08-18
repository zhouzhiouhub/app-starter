export interface AuthUser {
  email: string;
  id: string;
  name: string | null;
  roles: string[];
  scopes: string[];
  tenantId: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
