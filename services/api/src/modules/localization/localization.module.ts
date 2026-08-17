import { Module } from "@nestjs/common";
import { LocalizationController } from "./localization.controller.js";

@Module({
  controllers: [LocalizationController]
})
export class LocalizationModule {}
