import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import type { Actor } from "../identity/identity.types.js";
import { SitesService } from "./sites.service.js";

@Controller("sites")
@UseGuards(AdminApiGuard)
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get("current")
  @RequireScopes("site:read")
  getCurrent(@CurrentUser() actor: Actor) {
    return this.sites.getCurrent(actor);
  }

  @Put("current")
  @RequireScopes("site:write")
  updateCurrent(@CurrentUser() actor: Actor, @Body() body: unknown) {
    return this.sites.updateCurrent(body, actor);
  }
}
