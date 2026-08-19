import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommerceModule } from "./commerce/commerce.module.js";
import { HealthModule } from "./health/health.module.js";
import { IdentityModule } from "./identity/identity.module.js";
import { LocalizationModule } from "./localization/localization.module.js";
import { MediaModule } from "./media/media.module.js";
import { PagesModule } from "./pages/pages.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { PublicModule } from "./public/public.module.js";
import { SitesModule } from "./sites/sites.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "../../.env"],
      isGlobal: true
    }),
    PrismaModule,
    IdentityModule,
    HealthModule,
    PagesModule,
    MediaModule,
    SitesModule,
    PublicModule,
    LocalizationModule,
    CommerceModule
  ]
})
export class AppModule {}
