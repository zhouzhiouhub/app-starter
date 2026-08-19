import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import type { Actor } from "../identity/identity.types.js";
import { AuditService } from "./audit.service.js";

@Controller("audit-logs")
@UseGuards(AdminApiGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequireScopes("audit:read")
  list(
    @CurrentUser() actor: Actor,
    @Query("action") action?: string,
    @Query("actorId") actorId?: string,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
    @Query("targetId") targetId?: string,
    @Query("targetType") targetType?: string,
  ) {
    return this.audit.list(
      { action, actorId, limit, page, targetId, targetType },
      actor,
    );
  }
}
