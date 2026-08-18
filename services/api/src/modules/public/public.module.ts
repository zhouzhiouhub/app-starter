import { Module } from "@nestjs/common";
import { PagesModule } from "../pages/pages.module.js";
import { AdminPagesController, PublicController } from "./public.controller.js";

@Module({
  imports: [PagesModule],
  controllers: [PublicController, AdminPagesController],
})
export class PublicModule {}
