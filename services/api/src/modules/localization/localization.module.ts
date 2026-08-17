import { Module } from "@nestjs/common";
import { LocalizationController } from "./localization.controller";

@Module({
  controllers: [LocalizationController]
})
export class LocalizationModule {}
