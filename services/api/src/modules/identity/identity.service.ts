import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { PrismaService } from "../prisma/prisma.service.js";
import { readBearerToken } from "./identity.authorization.js";
import { ACTIVE_USER_STATUS } from "./identity.constants.js";
import {
  toActorFromUser,
  toAuthSessionResponse,
  toCurrentUserResponse,
} from "./identity.mapper.js";
import {
  createRefreshTokenRecord,
  findRefreshTokenByHash,
  RefreshTokenRotationConflictError,
  revokeActiveRefreshTokensForUser,
  revokeRefreshTokenByHash,
  rotateRefreshToken,
  userWithRoles,
} from "./identity.persistence.js";
import type { Actor } from "./identity.types.js";
import {
  parseLoginBody,
  parseRefreshBody,
} from "./identity.validation.js";
import { verifyPassword } from "./password.js";
import { TokenService } from "./token.service.js";

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(body: unknown, requestId = "local-dev") {
    const input = parseLoginBody(body);
    const user = await this.findUserByEmail(input.tenantSlug, input.email);

    if (
      !user ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      throw this.invalidCredentials();
    }

    this.assertActive(user.status);
    return this.issueSession(toActorFromUser(user), undefined, requestId);
  }

  async refresh(body: unknown, requestId = "local-dev") {
    const { refreshToken } = parseRefreshBody(body);
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const current = await findRefreshTokenByHash(this.prisma, tokenHash);

    if (!current) {
      throw this.invalidCredentials("Refresh token is invalid.");
    }

    if (current.revokedAt) {
      await revokeActiveRefreshTokensForUser(this.prisma, current.userId);
      throw this.invalidCredentials("Refresh token has already been used.");
    }

    if (current.expiresAt.getTime() <= Date.now()) {
      throw this.invalidCredentials("Refresh token has expired.");
    }

    this.assertActive(current.user.status);
    const actor = toActorFromUser(current.user);
    const session = await this.issueSession(actor, current.id, requestId);
    return session;
  }

  async logout(body: unknown, requestId = "local-dev") {
    const { refreshToken } = parseRefreshBody(body);
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    await revokeRefreshTokenByHash(this.prisma, tokenHash);

    return {
      data: { success: true },
      meta: { requestId },
    };
  }

  async getMe(actor: Actor, requestId = "local-dev") {
    return toCurrentUserResponse(actor, requestId);
  }

  async readActorFromAuthorization(
    authorization: string | undefined,
  ): Promise<Actor> {
    const token = readBearerToken(authorization);

    if (!token) {
      throw this.unauthorized("Access token is required.");
    }

    try {
      const claims = await this.tokens.verifyAccessToken(token);
      const user = await this.prisma.user.findFirst({
        where: { id: claims.sub, tenantId: claims.tenantId },
        include: userWithRoles,
      });

      if (!user) {
        throw this.unauthorized("Access token is invalid.");
      }

      this.assertActive(user.status);
      return toActorFromUser(user);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw this.unauthorized("Access token is invalid.");
    }
  }

  private async issueSession(
    actor: Actor,
    previousTokenId?: string,
    requestId = "local-dev",
  ) {
    const tokens = await this.tokens.issueTokens(actor);

    if (previousTokenId) {
      try {
        await rotateRefreshToken(
          this.prisma,
          this.tokens,
          actor,
          tokens,
          previousTokenId,
        );
      } catch (error) {
        if (error instanceof RefreshTokenRotationConflictError) {
          await revokeActiveRefreshTokensForUser(this.prisma, actor.id);
          throw this.invalidCredentials(
            "Refresh token has already been used.",
          );
        }

        throw error;
      }
    } else {
      await createRefreshTokenRecord(
        this.prisma,
        this.tokens,
        actor,
        tokens,
      );
    }

    return toAuthSessionResponse(actor, tokens, requestId);
  }

  private async findUserByEmail(tenantSlug: string, email: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });

    if (!tenant) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          email,
          tenantId: tenant.id,
        },
      },
      include: userWithRoles,
    });
  }

  private assertActive(status: string) {
    if (status !== ACTIVE_USER_STATUS) {
      throw new ForbiddenException({
        code: apiErrorCodes.FORBIDDEN,
        message: "Account is disabled.",
      });
    }
  }

  private invalidCredentials(message = "Email or password is incorrect.") {
    return new UnauthorizedException({
      code: apiErrorCodes.UNAUTHORIZED,
      message,
    });
  }

  private unauthorized(message: string) {
    return new UnauthorizedException({
      code: apiErrorCodes.UNAUTHORIZED,
      message,
    });
  }
}

export { readBearerToken } from "./identity.authorization.js";
