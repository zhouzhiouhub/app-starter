import { z } from "zod";
import { DEFAULT_AUTH_TENANT_SLUG } from "./identity.constants.js";

export const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  tenantSlug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .default(DEFAULT_AUTH_TENANT_SLUG),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(16).max(512),
});
export type RefreshBody = z.infer<typeof refreshBodySchema>;

export const accessTokenClaimsSchema = z.object({
  sub: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  scopes: z.array(z.string()).default([]),
});
