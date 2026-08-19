import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { MediaModule } from "../media/media.module.js";
import { PagesController } from "./pages.controller.js";
import { PagesService } from "./pages.service.js";

@Module({
  controllers: [PagesController],
  imports: [AuditModule, MediaModule],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
