import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";

@Module({
  controllers: [MediaController],
  imports: [PrismaModule, IdentityModule],
  providers: [MediaService],
})
export class MediaModule {}
