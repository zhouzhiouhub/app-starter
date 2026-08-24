import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { LocalizationController } from "./localization.controller.js";
import { LocalizationService } from "./localization.service.js";

@Module({
  controllers: [LocalizationController],
  imports: [PrismaModule],
  providers: [LocalizationService],
})
export class LocalizationModule {}
