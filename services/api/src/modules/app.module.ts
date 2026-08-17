import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommerceModule } from "./commerce/commerce.module";
import { HealthModule } from "./health/health.module";
import { LocalizationModule } from "./localization/localization.module";
import { PublicModule } from "./public/public.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    PublicModule,
    LocalizationModule,
    CommerceModule
  ]
})
export class AppModule {}
