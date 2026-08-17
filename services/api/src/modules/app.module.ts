import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommerceModule } from "./commerce/commerce.module.js";
import { HealthModule } from "./health/health.module.js";
import { LocalizationModule } from "./localization/localization.module.js";
import { PublicModule } from "./public/public.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "../../.env"],
      isGlobal: true
    }),
    HealthModule,
    PublicModule,
    LocalizationModule,
    CommerceModule
  ]
})
export class AppModule {}
