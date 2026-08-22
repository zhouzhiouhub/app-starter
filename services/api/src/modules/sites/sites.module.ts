import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SitesController } from "./sites.controller.js";
import { SitesService } from "./sites.service.js";

@Module({
  controllers: [SitesController],
  imports: [PrismaModule],
  providers: [SitesService],
})
export class SitesModule {}
