import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { apiErrorCodes } from "@app-starter/schema";
import { IdentityService } from "../modules/identity/identity.service.js";
import type { Actor } from "../modules/identity/identity.types.js";
import { REQUEST_USER_KEY } from "./current-user.decorator.js";
import { REQUIRE_SCOPES_KEY } from "./require-scopes.decorator.js";

@Injectable()
export class AdminApiGuard implements CanActivate {
  constructor(
    private readonly identity: IdentityService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      [REQUEST_USER_KEY]?: Actor;
    }>();
    const actor = await this.identity.readActorFromAuthorization(
      readHeader(request.headers?.authorization),
    );
    request[REQUEST_USER_KEY] = actor;

    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(REQUIRE_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const missing = requiredScopes.filter(
      (scope) => !actor.scopes.includes(scope),
    );

    if (missing.length > 0) {
      throw new ForbiddenException({
        code: apiErrorCodes.FORBIDDEN,
        message: "You do not have permission to perform this action.",
      });
    }

    return true;
  }
}

function readHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
