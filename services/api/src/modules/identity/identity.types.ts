export interface Actor {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  status: string;
  roles: string[];
  scopes: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenClaims {
  sub: string;
  tenantId: string;
  email: string;
  scopes: string[];
}
