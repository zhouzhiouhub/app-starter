import { Body, Controller, Get, Head, Post, UseGuards } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { buildLoginGetHint } from "./identity.login-hint.js";
import { IdentityService } from "./identity.service.js";
import type { Actor } from "./identity.types.js";

@Controller("auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get("login")
  @Head("login")
  describeLogin() {
    return buildLoginGetHint();
  }

  @Post("login")
  login(
    @Body() body: unknown,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.identity.login(body, requestId);
  }

  @Post("refresh")
  refresh(
    @Body() body: unknown,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.identity.refresh(body, requestId);
  }

  @Post("logout")
  logout(
    @Body() body: unknown,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.identity.logout(body, requestId);
  }

  @Get("me")
  @UseGuards(AdminApiGuard)
  getMe(
    @CurrentUser() actor: Actor,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    return this.identity.getMe(actor, requestId);
  }
}
