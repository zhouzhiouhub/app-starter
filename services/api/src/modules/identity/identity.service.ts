import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { ZodError } from "zod";
import { PrismaService } from "../prisma/prisma.service.js";
import { ACTIVE_USER_STATUS } from "./identity.constants.js";
import {
  toActorFromUser,
  toAuthSessionResponse,
  toCurrentUserResponse,
} from "./identity.mapper.js";
import type { Actor } from "./identity.types.js";
import {
  loginBodySchema,
  refreshBodySchema,
} from "./identity.validation.js";
import { verifyPassword } from "./password.js";
import { TokenService } from "./token.service.js";

const userWithRoles = {
  roles: {
    include: {
      role: true,
    },
  },
} as const;

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(body: unknown) {
    const input = this.parseLogin(body);
    const user = await this.findUserByEmail(input.tenantSlug, input.email);

    if (
      !user ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      throw this.invalidCredentials();
    }

    this.assertActive(user.status);
    return this.issueSession(toActorFromUser(user));
  }

  async refresh(body: unknown) {
    const { refreshToken } = this.parseRefresh(body);
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const current = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: userWithRoles,
        },
      },
    });

    if (!current) {
      throw this.invalidCredentials("Refresh token is invalid.");
    }

    if (current.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: current.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw this.invalidCredentials("Refresh token has already been used.");
    }

    if (current.expiresAt.getTime() <= Date.now()) {
      throw this.invalidCredentials("Refresh token has expired.");
    }

    this.assertActive(current.user.status);
    const actor = toActorFromUser(current.user);
    const session = await this.issueSession(actor, current.id);
    return session;
  }

  async logout(body: unknown) {
    const { refreshToken } = this.parseRefresh(body);
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      data: { success: true },
      meta: { requestId: "local-dev" },
    };
  }

  async getMe(authorization: string | undefined) {
    const actor = await this.readActorFromAuthorization(authorization);
    return toCurrentUserResponse(actor);
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

  private async issueSession(actor: Actor, previousTokenId?: string) {
    const tokens = await this.tokens.issueTokens(actor);
    const created = await this.prisma.refreshToken.create({
      data: {
        expiresAt: this.tokens.refreshTokenExpiresAt(),
        tokenHash: this.tokens.hashRefreshToken(tokens.refreshToken),
        userId: actor.id,
      },
      select: { id: true },
    });

    if (previousTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: previousTokenId },
        data: {
          replacedById: created.id,
          revokedAt: new Date(),
        },
      });
    }

    return toAuthSessionResponse(actor, tokens);
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

  private parseLogin(body: unknown) {
    return this.parseOrThrow(() => loginBodySchema.parse(body));
  }

  private parseRefresh(body: unknown) {
    return this.parseOrThrow(() => refreshBodySchema.parse(body));
  }

  private parseOrThrow<T>(fn: () => T): T {
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

export function readBearerToken(
  authorization: string | undefined,
): string | undefined {
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}
