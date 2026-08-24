import { Module } from "@nestjs/common";
import { PagesModule } from "../pages/pages.module.js";
import { AdminPagesController } from "./admin-pages.controller.js";
import { PublicController } from "./public.controller.js";

@Module({
  imports: [PagesModule],
  controllers: [PublicController, AdminPagesController],
})
export class PublicModule {}
