import {
  Body,
  Controller,
  Get,
  MethodNotAllowedException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentUser } from "../../common/current-user.decorator.js";
import { IdentityService } from "./identity.service.js";
import type { Actor } from "./identity.types.js";

@Controller("auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get("login")
  rejectLoginGet() {
    throw new MethodNotAllowedException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message:
        "Login accepts POST only. Open the Admin page at /login and submit the form; do not open /api/v1/auth/login in the browser.",
    });
  }

  @Post("login")
  login(@Body() body: unknown) {
    return this.identity.login(body);
  }

  @Post("refresh")
  refresh(@Body() body: unknown) {
    return this.identity.refresh(body);
  }

  @Post("logout")
  logout(@Body() body: unknown) {
    return this.identity.logout(body);
  }

  @Get("me")
  @UseGuards(AdminApiGuard)
  getMe(@CurrentUser() actor: Actor) {
    return this.identity.getMe(actor);
  }
}
