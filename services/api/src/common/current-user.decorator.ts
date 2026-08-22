import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import type { Actor } from "../modules/identity/identity.types.js";

export const REQUEST_USER_KEY = "user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context.switchToHttp().getRequest<{ user?: Actor }>();

    if (!request.user) {
      throw new UnauthorizedException({
        code: apiErrorCodes.UNAUTHORIZED,
        message: "Access token is required.",
      });
    }

    return request.user;
  },
);
