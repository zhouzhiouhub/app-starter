import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { z, ZodError } from "zod";
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
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/)
    .default(DEFAULT_AUTH_TENANT_SLUG),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(16).max(512).regex(/^[A-Za-z0-9_-]+$/),
});
export type RefreshBody = z.infer<typeof refreshBodySchema>;

export const accessTokenClaimsSchema = z.object({
  sub: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  scopes: z.array(z.string()).default([]),
});

export function parseLoginBody(body: unknown): LoginBody {
  return parseOrThrow(() => loginBodySchema.parse(body));
}

export function parseRefreshBody(body: unknown): RefreshBody {
  return parseOrThrow(() => refreshBodySchema.parse(body));
}

function parseOrThrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException({
        code: apiErrorCodes.VALIDATION_ERROR,
        details: error.flatten(),
        message: error.issues[0]?.message ?? "Invalid request.",
      });
    }

    throw error;
  }
}
