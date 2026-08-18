import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { IdentityService } from "./identity.service.js";

@Controller("auth")
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

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
  getMe(@Headers("authorization") authorization: string | undefined) {
    return this.identity.getMe(authorization);
  }
}
