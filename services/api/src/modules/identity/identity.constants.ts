export const BCRYPT_COST = 12;
export const ACCESS_TOKEN_TTL = "15m";
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const JWT_ISSUER = "app-starter-api";
export const JWT_AUDIENCE = "app-starter-admin";
export const JWT_ALGORITHM = "RS256";
export const DEFAULT_AUTH_TENANT_SLUG = "default";
export const TENANT_ADMIN_ROLE = "tenant-admin";
export const TENANT_ADMIN_PERMISSIONS = [
  "page:read",
  "page:write",
  "page:publish",
  "market:read",
  "locale:read",
  "translation:read",
] as const;
export const ACTIVE_USER_STATUS = "active";
