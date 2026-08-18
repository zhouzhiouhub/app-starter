import { Global, Module } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { TokenService } from "./token.service.js";

@Global()
@Module({
  controllers: [IdentityController],
  providers: [AdminApiGuard, IdentityService, TokenService],
  exports: [AdminApiGuard, IdentityService, TokenService],
})
export class IdentityModule {}
