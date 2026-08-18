import { Module } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { PagesModule } from "../pages/pages.module.js";
import { AdminPagesController, PublicController } from "./public.controller.js";

@Module({
  imports: [PagesModule],
  controllers: [PublicController, AdminPagesController],
  providers: [AdminApiGuard],
})
export class PublicModule {}
