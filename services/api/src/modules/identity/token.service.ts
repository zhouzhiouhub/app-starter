import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { SignJWT, jwtVerify } from "jose";
import {
  ACCESS_TOKEN_TTL,
  JWT_ALGORITHM,
  JWT_AUDIENCE,
  JWT_ISSUER,
  REFRESH_TOKEN_TTL_DAYS,
} from "./identity.constants.js";
import type { AccessTokenClaims, Actor, AuthTokens } from "./identity.types.js";
import { accessTokenClaimsSchema } from "./identity.validation.js";
import { loadJwtKeys } from "./jwt-keys.js";

@Injectable()
export class TokenService {
  async issueTokens(actor: Actor): Promise<AuthTokens> {
    const keys = await loadJwtKeys();
    const accessToken = await new SignJWT({
      email: actor.email,
      scopes: actor.scopes,
      tenantId: actor.tenantId,
    })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
      .setSubject(actor.id)
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .sign(keys.privateKey);

    return {
      accessToken,
      refreshToken: randomBytes(32).toString("base64url"),
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const keys = await loadJwtKeys();
    const { payload } = await jwtVerify(token, keys.publicKey, {
      algorithms: [JWT_ALGORITHM],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });

    return accessTokenClaimsSchema.parse({
      email: payload.email,
      scopes: payload.scopes,
      sub: payload.sub,
      tenantId: payload.tenantId,
    });
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  refreshTokenExpiresAt(now = new Date()): Date {
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + REFRESH_TOKEN_TTL_DAYS);
    return expiresAt;
  }
}
