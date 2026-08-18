import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { PagesController } from "./pages.controller.js";
import { PagesService } from "./pages.service.js";

@Module({
  controllers: [PagesController],
  imports: [MediaModule],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
