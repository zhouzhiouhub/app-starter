import { CanActivate, ForbiddenException, Injectable } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

@Injectable()
export class AdminApiGuard implements CanActivate {
  canActivate(): boolean {
    if (isLocalRuntime()) {
      return true;
    }

    throw new ForbiddenException({
      code: apiErrorCodes.FORBIDDEN,
      message:
        "Admin API is closed in production until JWT/RBAC authentication is implemented.",
    });
  }
}

function isLocalRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? "development";

  return nodeEnv === "development" || nodeEnv === "test";
}
