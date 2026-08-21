import type { PrismaService } from "../prisma/prisma.service.js";
import type { Actor, AuthTokens } from "./identity.types.js";
import type { TokenService } from "./token.service.js";

type RefreshTokenClient = Pick<PrismaService, "refreshToken">;

export class RefreshTokenRotationConflictError extends Error {
  constructor() {
    super("Refresh token was already rotated.");
  }
}

export const userWithRoles = {
  roles: {
    include: {
      role: true,
    },
  },
} as const;

export function findRefreshTokenByHash(
  prisma: RefreshTokenClient,
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
  prisma: RefreshTokenClient,
  userId: string,
) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function revokeRefreshTokenByHash(
  prisma: RefreshTokenClient,
  tokenHash: string,
) {
  return prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function createRefreshTokenRecord(
  prisma: RefreshTokenClient,
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
  prisma: RefreshTokenClient,
  previousTokenId: string,
  replacementTokenId: string,
) {
  return prisma.refreshToken.updateMany({
    where: { id: previousTokenId, revokedAt: null },
    data: {
      replacedById: replacementTokenId,
      revokedAt: new Date(),
    },
  });
}

export async function rotateRefreshToken(
  prisma: PrismaService,
  tokenService: Pick<
    TokenService,
    "hashRefreshToken" | "refreshTokenExpiresAt"
  >,
  actor: Actor,
  tokens: AuthTokens,
  previousTokenId: string,
) {
  return prisma.$transaction(async (client) => {
    const created = await createRefreshTokenRecord(
      client,
      tokenService,
      actor,
      tokens,
    );
    const replaced = await replaceRefreshToken(
      client,
      previousTokenId,
      created.id,
    );

    if (replaced.count !== 1) {
      throw new RefreshTokenRotationConflictError();
    }

    return created;
  });
}
