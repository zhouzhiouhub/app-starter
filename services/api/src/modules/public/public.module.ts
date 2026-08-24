import { Module } from "@nestjs/common";
import { PagesModule } from "../pages/pages.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AdminPagesController } from "./admin-pages.controller.js";
import { PublicController } from "./public.controller.js";
import { PublicTranslationsService } from "./public-translations.service.js";

@Module({
  imports: [PagesModule, PrismaModule],
  controllers: [PublicController, AdminPagesController],
  providers: [PublicTranslationsService],
})
export class PublicModule {}
