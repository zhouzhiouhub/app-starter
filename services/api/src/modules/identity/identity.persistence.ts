import type { PrismaService } from "../prisma/prisma.service.js";
import type { Actor, AuthTokens } from "./identity.types.js";
import type { TokenService } from "./token.service.js";

export const userWithRoles = {
  roles: {
    include: {
      role: true,
    },
  },
} as const;

export function findRefreshTokenByHash(
  prisma: PrismaService,
  tokenHash: string,
) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: userWithRoles,
      },
    },
  });
}

export function revokeActiveRefreshTokensForUser(
  prisma: PrismaService,
  userId: string,
) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function revokeRefreshTokenByHash(
  prisma: PrismaService,
  tokenHash: string,
) {
  return prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function createRefreshTokenRecord(
  prisma: PrismaService,
  tokenService: Pick<
    TokenService,
    "hashRefreshToken" | "refreshTokenExpiresAt"
  >,
  actor: Actor,
  tokens: AuthTokens,
) {
  return prisma.refreshToken.create({
    data: {
      expiresAt: tokenService.refreshTokenExpiresAt(),
      tokenHash: tokenService.hashRefreshToken(tokens.refreshToken),
      userId: actor.id,
    },
    select: { id: true },
  });
}

export function replaceRefreshToken(
  prisma: PrismaService,
  previousTokenId: string,
  replacementTokenId: string,
) {
  return prisma.refreshToken.update({
    where: { id: previousTokenId },
    data: {
      replacedById: replacementTokenId,
      revokedAt: new Date(),
    },
  });
}
